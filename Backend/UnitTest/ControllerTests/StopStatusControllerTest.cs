using API.Controllers;
using API.Data;
using API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace UnitTest.ControllerTests;

public class StopStatusControllerTest
{
    private static async Task<AppDBContext> CreateContextWithData()
    {
        var context = new AppDBContext(new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        context.StopStatuses.AddRange(
            new StopStatus { Id = 1, Name = "Scheduled" },
            new StopStatus { Id = 2, Name = "Delivered" },
            new StopStatus { Id = 3, Name = "Failed" }
        );
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.RouteStatuses.Add(new RouteStatus { Id = 1, Name = "Pending" });
        context.Users.Add(new User { Id = 1, Name = "TestUser", Email = "test@example.com", Password = "hashed", RoleId = 1 });
        context.DeliveryRoutes.Add(new DeliveryRoute
        {
            Id = 1,
            Name = "Rute 1",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Today),
            UserId = 1,
            RouteStatusId = 1
        });
        context.Stops.Add(new Stop
        {
            Id = 1,
            Address = "Testvej 1",
            Latitude = 55.67,
            Longitude = 12.56,
            SequenceOrder = 1,
            RouteId = 1,
            StopStatusId = 1
        });
        await context.SaveChangesAsync();
        return context;
    }

    [Test]
    public async Task GetAllStopStatuses_ReturnsOk_WithStatuses()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new StopStatusController(context).GetAllStopStatuses();

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var statuses = (List<StopStatusDto>)((OkObjectResult)result.Result!).Value!;
        Assert.That(statuses, Has.Count.EqualTo(3));
    }

    [Test]
    public async Task GetStopStatus_ReturnsOk_WhenStopExists()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new StopStatusController(context).GetStopStatus(1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var dto = (StopDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(dto.Status!.Name, Is.EqualTo("Scheduled"));
    }

    [Test]
    public async Task GetStopStatus_ReturnsNotFound_WhenStopDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new StopStatusController(context).GetStopStatus(999);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task UpdateStopStatus_ReturnsOk_WhenValid()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - skift status fra Scheduled (1) til Delivered (2)
        var result = await new StopStatusController(context)
            .UpdateStopStatus(1, new UpdateStopStatusDto { StopStatusId = 2 });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var dto = (StopDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(dto.Status!.Name, Is.EqualTo("Delivered"));
    }

    [Test]
    public async Task UpdateStopStatus_ReturnsNotFound_WhenStopDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await new StopStatusController(context)
            .UpdateStopStatus(999, new UpdateStopStatusDto { StopStatusId = 1 });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task UpdateStopStatus_ReturnsBadRequest_WhenStatusDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - brug et status-ID der ikke eksisterer
        var result = await new StopStatusController(context)
            .UpdateStopStatus(1, new UpdateStopStatusDto { StopStatusId = 999 });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }
}
