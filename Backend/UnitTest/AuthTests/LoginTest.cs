using API.Controllers;
using API.Data;
using API.Model;
using API.Service;
using API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace UnitTest.AuthTests;

public class LoginTest
{
    [Test]
    public async Task Login_ValidCredentials_ReturnsOk()
    {
        // Arrange - opret in-memory database med en bruger
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppDBContext(options);

        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User
        {
            Id = 1,
            Name = "TestUser",
            Email = "test@example.com",
            Password = PasswordHelper.CreatePasswordHashString("Password123!"),
            RoleId = 1
        });
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Jwt:SecretKey", "SuperSecretTestKeyThatIsLongEnough1234567890" },
                { "Jwt:Issuer", "test" },
                { "Jwt:Audience", "test" },
                { "Jwt:ExpiryMinutes", "60" }
            })
            .Build();

        var controller = new AuthController(context, new JwtService(config));

        // Act - log ind med korrekte oplysninger
        var result = await controller.Login(new LoginUserDto
        {
            Email = "test@example.com",
            Password = "Password123!"
        });

        // Assert - vi får OK (200) tilbage
        Assert.That(result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppDBContext(options);

        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User
        {
            Id = 1,
            Name = "TestUser",
            Email = "test@example.com",
            Password = PasswordHelper.CreatePasswordHashString("Password123!"),
            RoleId = 1
        });
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Jwt:SecretKey", "SuperSecretTestKeyThatIsLongEnough1234567890" },
                { "Jwt:Issuer", "test" },
                { "Jwt:Audience", "test" },
                { "Jwt:ExpiryMinutes", "60" }
            })
            .Build();

        var controller = new AuthController(context, new JwtService(config));

        // Act - log ind med forkert password
        var result = await controller.Login(new LoginUserDto
        {
            Email = "test@example.com",
            Password = "WrongPassword!"
        });

        // Assert - vi får Unauthorized (401) tilbage
        Assert.That(result, Is.InstanceOf<UnauthorizedObjectResult>());
    }
}
