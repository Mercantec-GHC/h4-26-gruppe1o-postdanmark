using API.Controllers;
using API.Data;
using API.Model;
using API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace UnitTest.AuthTests;

public class RegisterTest
{
    private static AuthController CreateController(AppDBContext context)
    {
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

        // Sæt op ControllerContext så TryValidateModel virker i unit tests
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        controller.ObjectValidator = new NoOpObjectValidator();

        return controller;
    }

    [Test]
    public async Task Register_ValidData_ReturnsOk()
    {
        // Arrange - opret in-memory database med Employee rolle
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppDBContext(options);
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act - registrer en ny bruger
        var result = await controller.Register(new RegisterUserDto
        {
            Name = "NewUser",
            Email = "newuser@example.com",
            Password = "Password123!"
        });

        // Assert - vi får OK (200) tilbage
        Assert.That(result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        // Arrange - opret in-memory database med en eksisterende bruger
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppDBContext(options);
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User
        {
            Id = 1,
            Name = "ExistingUser",
            Email = "existing@example.com",
            Password = PasswordHelper.CreatePasswordHashString("Password123!"),
            RoleId = 1
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act - registrer med email der allerede er i brug
        var result = await controller.Register(new RegisterUserDto
        {
            Name = "AnotherUser",
            Email = "existing@example.com",
            Password = "Password123!"
        });

        // Assert - vi får BadRequest (400) tilbage
        Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task Register_DuplicateUsername_ReturnsBadRequest()
    {
        // Arrange - opret in-memory database med en eksisterende bruger
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppDBContext(options);
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User
        {
            Id = 1,
            Name = "ExistingUser",
            Email = "existing@example.com",
            Password = PasswordHelper.CreatePasswordHashString("Password123!"),
            RoleId = 1
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act - registrer med brugernavn der allerede er i brug
        var result = await controller.Register(new RegisterUserDto
        {
            Name = "ExistingUser",
            Email = "newuser@example.com",
            Password = "Password123!"
        });

        // Assert - vi får BadRequest (400) tilbage
        Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task Register_DuplicateEmailDifferentCase_ReturnsBadRequest()
    {
        // Arrange - opret in-memory database med en eksisterende bruger
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new AppDBContext(options);
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User
        {
            Id = 1,
            Name = "ExistingUser",
            Email = "existing@example.com",
            Password = PasswordHelper.CreatePasswordHashString("Password123!"),
            RoleId = 1
        });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act - registrer med samme email men forskellig case
        var result = await controller.Register(new RegisterUserDto
        {
            Name = "NewUser",
            Email = "EXISTING@EXAMPLE.COM",
            Password = "Password123!"
        });

        // Assert - vi får BadRequest (400) tilbage
        Assert.That(result, Is.InstanceOf<BadRequestObjectResult>());
    }

    /// <summary>
    /// En falsk validator der ikke gør noget som helst.
    ///
    /// ASP.NET's controller kræver en ObjectValidator for at kalde TryValidateModel().
    /// I en rigtig app sætter frameworket denne automatisk op, men i unit tests mangler
    /// den del af infrastrukturen - så vi giver controlleren en tom implementering,
    /// der bare accepterer alt uden at validere noget.
    /// </summary>
    private class NoOpObjectValidator : IObjectModelValidator
    {
        public void Validate(
            Microsoft.AspNetCore.Mvc.ActionContext actionContext,
            ValidationStateDictionary? validationState,
            string prefix,
            object? model)
        {
            // No-op: skip validation i unit tests
        }
    }
}
