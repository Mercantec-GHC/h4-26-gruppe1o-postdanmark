using API.Controllers;
using API.Data;
using API.Model;
using API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Test;

public class RegisterTests
{
    private AppDBContext _context;
    private AuthController _controller;

    [SetUp]
    public void Setup()
    {
        // Create a fresh in-memory database for each test
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new AppDBContext(options);

        // Seed the Employee role (Id = 1) used by Register
        _context.Roles.Add(new Role { Id = 1, Name = "Employee", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        _context.SaveChanges();

        // JwtService is not used in Register, but required by constructor
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                { "Jwt:SecretKey", "SuperSecretTestKeyThatIsLongEnough1234567890" },
                { "Jwt:Issuer", "test" },
                { "Jwt:Audience", "test" },
                { "Jwt:ExpiryMinutes", "60" }
            })
            .Build();

        var jwtService = new JwtService(config);
        _controller = new AuthController(_context, jwtService);

        // AuthController uses TryValidateModel which needs an HttpContext
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        // Required for ObjectValidator used by TryValidateModel
        _controller.ObjectValidator = new DefaultObjectValidator();
    }

    [TearDown]
    public void TearDown()
    {
        _context.Dispose();
    }

    [Test]
    public async Task Register_ValidUser_ReturnsOkWithUserInfo()
    {
        var dto = new RegisterUserDto
        {
            Name = "TestUser",
            Email = "test@example.com",
            Password = "Password123!"
        };

        var result = await _controller.Register(dto);

        Assert.That(result, Is.InstanceOf<OkObjectResult>());
        var ok = (OkObjectResult)result;
        var value = ok.Value!;
        var message = value.GetType().GetProperty("message")!.GetValue(value)!.ToString();
        Assert.That(message, Is.EqualTo("Bruger registreret succesfuldt."));

        // Verify user was saved in database
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        Assert.That(user, Is.Not.Null);
        Assert.That(user!.Name, Is.EqualTo("TestUser"));
    }

    [Test]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        _context.Users.Add(new User
        {
            Name = "ExistingUser",
            Email = "test@example.com",
            Password = "hashedpassword",
            RoleId = 1,
            LastLogin = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var dto = new RegisterUserDto
        {
            Name = "NewUser",
            Email = "test@example.com",
            Password = "Password123!"
        };

        var result = await _controller.Register(dto);

        Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
        var bad = (BadRequestObjectResult)result;
        var value = bad.Value!;
        var message = value.GetType().GetProperty("message")!.GetValue(value)!.ToString();
        Assert.That(message, Is.EqualTo("Email er allerede i brug."));
    }

    [Test]
    public async Task Register_DuplicateUsername_ReturnsBadRequest()
    {
        _context.Users.Add(new User
        {
            Name = "TestUser",
            Email = "existing@example.com",
            Password = "hashedpassword",
            RoleId = 1,
            LastLogin = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var dto = new RegisterUserDto
        {
            Name = "TestUser",
            Email = "new@example.com",
            Password = "Password123!"
        };

        var result = await _controller.Register(dto);

        Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
        var bad = (BadRequestObjectResult)result;
        var value = bad.Value!;
        var message = value.GetType().GetProperty("message")!.GetValue(value)!.ToString();
        Assert.That(message, Is.EqualTo("Brugernavn er allerede i brug."));
    }

    [Test]
    public async Task Register_EmailIsCaseInsensitive_ReturnsBadRequest()
    {
        _context.Users.Add(new User
        {
            Name = "ExistingUser",
            Email = "test@example.com",
            Password = "hashedpassword",
            RoleId = 1,
            LastLogin = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var dto = new RegisterUserDto
        {
            Name = "NewUser",
            Email = "TEST@EXAMPLE.COM",
            Password = "Password123!"
        };

        var result = await _controller.Register(dto);

        Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task Register_UsernameAlias_MapsToName()
    {
        var dto = new RegisterUserDto
        {
            Username = "AliasUser",
            Email = "alias@example.com",
            Password = "Password123!"
        };

        var result = await _controller.Register(dto);

        Assert.That(result, Is.InstanceOf<OkObjectResult>());

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "alias@example.com");
        Assert.That(user, Is.Not.Null);
        Assert.That(user!.Name, Is.EqualTo("AliasUser"));
    }

    [Test]
    public async Task Register_PasswordIsHashed_NotStoredPlaintext()
    {
        var dto = new RegisterUserDto
        {
            Name = "HashUser",
            Email = "hash@example.com",
            Password = "Password123!"
        };

        await _controller.Register(dto);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "hash@example.com");
        Assert.That(user, Is.Not.Null);
        Assert.That(user!.Password, Is.Not.EqualTo("Password123!"));
        Assert.That(user.Password, Does.StartWith("$2")); // BCrypt hash prefix
    }

    [Test]
    public async Task Register_DefaultRoleIsEmployee()
    {
        var dto = new RegisterUserDto
        {
            Name = "RoleUser",
            Email = "role@example.com",
            Password = "Password123!"
        };

        await _controller.Register(dto);

        var user = await _context.Users.Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == "role@example.com");
        Assert.That(user, Is.Not.Null);
        Assert.That(user!.RoleId, Is.EqualTo(1));
        Assert.That(user.Role.Name, Is.EqualTo("Employee"));
    }
}

/// <summary>
/// Minimal IObjectModelValidator so TryValidateModel works outside a real ASP.NET pipeline.
/// </summary>
internal class DefaultObjectValidator : Microsoft.AspNetCore.Mvc.ModelBinding.Validation.IObjectModelValidator
{
    public void Validate(
        Microsoft.AspNetCore.Mvc.ActionContext actionContext,
        Microsoft.AspNetCore.Mvc.ModelBinding.Validation.ValidationStateDictionary? validationState,
        string prefix,
        object? model)
    {
        if (model == null) return;
        var validationResults = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        var ctx = new System.ComponentModel.DataAnnotations.ValidationContext(model);
        System.ComponentModel.DataAnnotations.Validator.TryValidateObject(model, ctx, validationResults, validateAllProperties: true);
        foreach (var vr in validationResults)
        {
            foreach (var memberName in vr.MemberNames)
            {
                actionContext.ModelState.AddModelError(memberName, vr.ErrorMessage ?? "Validation error");
            }
        }
    }
}
