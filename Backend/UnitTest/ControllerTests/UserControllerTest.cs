using System.Security.Claims;
using API.Controllers;
using API.Data;
using API.Model;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace UnitTest.ControllerTests;

public class UserControllerTest
{
    private static AppDBContext CreateContext() =>
        new AppDBContext(new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static UserController CreateControllerWithUser(AppDBContext context, int userId, string role = "Employee")
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        var controller = new UserController(context);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
        return controller;
    }

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

    [Test]
    public async Task DeleteUser_ReturnsOk_WhenEmployeeDeletesOwnAccount()
    {
        // Arrange
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com", Password = "hashed", RoleId = 1 });
        await context.SaveChangesAsync();

        var controller = CreateControllerWithUser(context, userId: 1, role: "Employee");

        // Act
        var result = await controller.DeleteUser(1);

        // Assert
        Assert.That(result, Is.InstanceOf<OkObjectResult>());
        Assert.That(await context.Users.CountAsync(), Is.EqualTo(0));
    }

    [Test]
    public async Task DeleteUser_ReturnsOk_WhenAdminDeletesAnotherUser()
    {
        // Arrange
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Roles.Add(new Role { Id = 2, Name = "Admin" });
        context.Users.Add(new User { Id = 1, Name = "Admin", Email = "admin@example.com", Password = "hashed", RoleId = 2 });
        context.Users.Add(new User { Id = 2, Name = "Employee", Email = "emp@example.com", Password = "hashed", RoleId = 1 });
        await context.SaveChangesAsync();

        var controller = CreateControllerWithUser(context, userId: 1, role: "Admin");

        // Act
        var result = await controller.DeleteUser(2);

        // Assert
        Assert.That(result, Is.InstanceOf<OkObjectResult>());
        Assert.That(await context.Users.CountAsync(), Is.EqualTo(1));
    }

    [Test]
    public async Task DeleteUser_ReturnsForbid_WhenEmployeeDeletesAnotherUser()
    {
        // Arrange
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User { Id = 1, Name = "User1", Email = "user1@example.com", Password = "hashed", RoleId = 1 });
        context.Users.Add(new User { Id = 2, Name = "User2", Email = "user2@example.com", Password = "hashed", RoleId = 1 });
        await context.SaveChangesAsync();

        var controller = CreateControllerWithUser(context, userId: 1, role: "Employee");

        // Act
        var result = await controller.DeleteUser(2);

        // Assert
        Assert.That(result, Is.InstanceOf<ForbidResult>());
        Assert.That(await context.Users.CountAsync(), Is.EqualTo(2));
    }

    [Test]
    public async Task DeleteUser_ReturnsNotFound_WhenUserDoesNotExist()
    {
        // Arrange
        var context = CreateContext();
        var controller = CreateControllerWithUser(context, userId: 999, role: "Admin");

        // Act
        var result = await controller.DeleteUser(999);

        // Assert
        Assert.That(result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task DeleteUser_DeletesCreatedRoutes()
    {
        // Arrange
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.RouteStatuses.Add(new RouteStatus { Id = 1, Name = "Pending" });
        context.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com", Password = "hashed", RoleId = 1 });
        context.DeliveryRoutes.Add(new DeliveryRoute
        {
            Id = 1, Name = "Route1", UserId = 1, RouteStatusId = 1, ScheduledDate = DateOnly.FromDateTime(DateTime.Now)
        });
        await context.SaveChangesAsync();

        var controller = CreateControllerWithUser(context, userId: 1, role: "Employee");

        // Act
        var result = await controller.DeleteUser(1);

        // Assert
        Assert.That(result, Is.InstanceOf<OkObjectResult>());
        Assert.That(await context.Users.CountAsync(), Is.EqualTo(0));
        Assert.That(await context.DeliveryRoutes.CountAsync(), Is.EqualTo(0));
    }

    [Test]
    public async Task DeleteUser_UnassignsFromAssignedRoutes()
    {
        // Arrange
        var context = CreateContext();
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Roles.Add(new Role { Id = 2, Name = "Admin" });
        context.RouteStatuses.Add(new RouteStatus { Id = 1, Name = "Assigned" });
        context.Users.Add(new User { Id = 1, Name = "Admin", Email = "admin@example.com", Password = "hashed", RoleId = 2 });
        context.Users.Add(new User { Id = 2, Name = "Employee", Email = "emp@example.com", Password = "hashed", RoleId = 1 });
        context.DeliveryRoutes.Add(new DeliveryRoute
        {
            Id = 1, Name = "Route1", UserId = 1, AssignedUserId = 2, RouteStatusId = 1, ScheduledDate = DateOnly.FromDateTime(DateTime.Now)
        });
        await context.SaveChangesAsync();

        var controller = CreateControllerWithUser(context, userId: 1, role: "Admin");

        // Act
        var result = await controller.DeleteUser(2);

        // Assert
        Assert.That(result, Is.InstanceOf<OkObjectResult>());
        Assert.That(await context.Users.CountAsync(), Is.EqualTo(1));
        var route = await context.DeliveryRoutes.FirstAsync();
        Assert.That(route.AssignedUserId, Is.Null);
    }
}
