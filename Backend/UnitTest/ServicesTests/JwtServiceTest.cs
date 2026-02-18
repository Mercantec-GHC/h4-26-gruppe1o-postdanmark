using System.IdentityModel.Tokens.Jwt;
using API.Model;
using API.Services;
using Microsoft.Extensions.Configuration;

namespace UnitTest.ServicesTests;

public class JwtServiceTest
{
    private static JwtService CreateService(int expiryMinutes = 60)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Jwt:SecretKey", "SuperSecretTestKeyThatIsLongEnough1234567890" },
                { "Jwt:Issuer", "test-issuer" },
                { "Jwt:Audience", "test-audience" },
                { "Jwt:ExpiryMinutes", expiryMinutes.ToString() }
            })
            .Build();

        return new JwtService(config);
    }

    private static User CreateUser(Role? role = null) => new User
    {
        Id = 42,
        Name = "TestUser",
        Email = "test@example.com",
        Password = "hashed",
        RoleId = role?.Id ?? 0,
        Role = role!
    };

    [Test]
    public void GenerateToken_ReturnsValidJwtFormat()
    {
        // Arrange
        var service = CreateService();
        var user = CreateUser();

        // Act
        var token = service.GenerateToken(user);

        // Assert - et JWT-token består altid af 3 dele adskilt med punktum (header.payload.signature)
        var parts = token.Split('.');
        Assert.That(parts, Has.Length.EqualTo(3), "Token er ikke et gyldigt JWT-format (header.payload.signature)");
    }

    [Test]
    public void GenerateToken_ContainsCorrectUserClaims()
    {
        // Arrange
        var service = CreateService();
        var user = CreateUser();

        // Act - generer token og læs det uden validering
        var token = service.GenerateToken(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);

        // Assert - tokenet skal indeholde brugerens id, navn og email
        Assert.That(parsed.Claims.First(c => c.Type == "userId").Value, Is.EqualTo("42"));
        Assert.That(parsed.Claims.First(c => c.Type == "username").Value, Is.EqualTo("TestUser"));
        Assert.That(parsed.Claims.First(c => c.Type == "email").Value, Is.EqualTo("test@example.com"));
    }

    [Test]
    public void GenerateToken_ContainsRoleClaim_WhenUserHasRole()
    {
        // Arrange - bruger med rollen "Admin"
        var service = CreateService();
        var user = CreateUser(new Role { Id = 1, Name = "Admin" });

        // Act
        var token = service.GenerateToken(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);

        // Assert - rolleclaim skal være med og have værdien "Admin"
        // ReadJwtToken bevarer den korte claim-type "role" (ikke den lange ClaimTypes.Role URI)
        var roleClaim = parsed.Claims.FirstOrDefault(c => c.Type == "role");
        Assert.That(roleClaim, Is.Not.Null, "Rolleclaim mangler i tokenet");
        Assert.That(roleClaim!.Value, Is.EqualTo("Admin"));
    }

    [Test]
    public void GenerateToken_NoRoleClaim_WhenUserHasNoRole()
    {
        // Arrange - bruger uden rolle (Role = null)
        var service = CreateService();
        var user = CreateUser(role: null);

        // Act
        var token = service.GenerateToken(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);

        // Assert - der må ikke være et rolleclaim i tokenet
        var roleClaim = parsed.Claims.FirstOrDefault(c => c.Type == "role");
        Assert.That(roleClaim, Is.Null, "Rolleclaim må ikke være med når brugeren ingen rolle har");
    }

    [Test]
    public void GenerateToken_HasCorrectIssuerAndAudience()
    {
        // Arrange
        var service = CreateService();
        var user = CreateUser();

        // Act
        var token = service.GenerateToken(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);

        // Assert - issuer og audience skal matche konfigurationen
        Assert.That(parsed.Issuer, Is.EqualTo("test-issuer"));
        Assert.That(parsed.Audiences.First(), Is.EqualTo("test-audience"));
    }

    [Test]
    public void GenerateToken_ExpiresAfterConfiguredTime()
    {
        // Arrange - token udløber efter 30 minutter
        var service = CreateService(expiryMinutes: 30);
        var user = CreateUser();
        var beforeGeneration = DateTime.UtcNow;

        // Act
        var token = service.GenerateToken(user);
        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);

        // Assert - udløbstid skal ligge ~30 minutter fra nu (med 5 sekunders tolerance)
        var expectedExpiry = beforeGeneration.AddMinutes(30);
        Assert.That(parsed.ValidTo, Is.EqualTo(expectedExpiry).Within(TimeSpan.FromSeconds(5)));
    }
}
