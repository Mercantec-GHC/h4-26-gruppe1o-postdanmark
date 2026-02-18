using API.Controllers;
using API.Data;
using API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace UnitTest.ControllerTests;

public class RouteStatusControllerTest
{
    private static async Task<AppDBContext> CreateContextWithData()
    {
        var context = new AppDBContext(new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        context.RouteStatuses.AddRange(
            new RouteStatus { Id = 1, Name = "Pending" },
            new RouteStatus { Id = 2, Name = "Completed" }
        );
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com", Password = "hashed", RoleId = 1 });
        context.DeliveryRoutes.Add(new DeliveryRoute
        {
            Id = 1,
            Name = "Rute 1",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Today),
            UserId = 1,
            RouteStatusId = 1
        });
        await context.SaveChangesAsync();
        return context;
    }

    [Test]
    public async Task GetAllRouteStatuses_ReturnsOk_WithStatuses()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new RouteStatusController(context).GetAllRouteStatuses();

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var statuses = (List<RouteStatusDto>)((OkObjectResult)result.Result!).Value!;
        Assert.That(statuses, Has.Count.EqualTo(2));
    }

    [Test]
    public async Task GetRouteStatus_ReturnsOk_WhenRouteExists()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new RouteStatusController(context).GetRouteStatus(1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var dto = (RouteStatusDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(dto.Name, Is.EqualTo("Pending"));
    }

    [Test]
    public async Task GetRouteStatus_ReturnsNotFound_WhenRouteDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new RouteStatusController(context).GetRouteStatus(999);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task UpdateRouteStatus_ReturnsOk_WhenValid()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - skift status fra Pending (1) til Completed (2)
        var result = await new RouteStatusController(context)
            .UpdateRouteStatus(1, new UpdateRouteStatusDto { RouteStatusId = 2 });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var dto = (DeliveryRouteDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(dto.StatusName, Is.EqualTo("Completed"));
    }

    [Test]
    public async Task UpdateRouteStatus_ReturnsNotFound_WhenRouteDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new RouteStatusController(context)
            .UpdateRouteStatus(999, new UpdateRouteStatusDto { RouteStatusId = 1 });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task UpdateRouteStatus_ReturnsBadRequest_WhenStatusDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - brug et status-ID der ikke eksisterer
        var result = await new RouteStatusController(context)
            .UpdateRouteStatus(1, new UpdateRouteStatusDto { RouteStatusId = 999 });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }
}
