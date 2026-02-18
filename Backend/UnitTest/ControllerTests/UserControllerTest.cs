using API.Controllers;
using API.Data;
using API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace UnitTest.ControllerTests;

public class UserControllerTest
{
    private static AppDBContext CreateContext() =>
        new AppDBContext(new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Test]
    public async Task GetAllUsers_ReturnsOk_WithEmptyList()
    {
        // Arrange - tom database
        var controller = new UserController(CreateContext());

        // Act
        var result = await controller.GetAllUsers();

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var users = (List<GetUserDto>)((OkObjectResult)result.Result!).Value!;
        Assert.That(users, Is.Empty);
    }

    [Test]
    public async Task GetAllUsers_ReturnsOk_WithUsers()
    {
        // Arrange - en bruger med rolle i databasen
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com", Password = "hashed", RoleId = 1 });
        await context.SaveChangesAsync();

        // Act
        var result = await new UserController(context).GetAllUsers();

        // Assert
        var users = (List<GetUserDto>)((OkObjectResult)result.Result!).Value!;
        Assert.That(users, Has.Count.EqualTo(1));
        Assert.That(users[0].Name, Is.EqualTo("TestUser"));
    }

    [Test]
    public async Task GetUserById_ReturnsOk_WhenUserExists()
    {
        // Arrange
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com", Password = "hashed", RoleId = 1 });
        await context.SaveChangesAsync();

        // Act
        var result = await new UserController(context).GetUserById(1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var user = (GetUserDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(user.Name, Is.EqualTo("TestUser"));
    }

    [Test]
    public async Task GetUserById_ReturnsNotFound_WhenUserDoesNotExist()
    {
        // Arrange - tom database
        var result = await new UserController(CreateContext()).GetUserById(999);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }
}
