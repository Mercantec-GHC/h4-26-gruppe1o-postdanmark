using API.Controllers;
using API.Data;
using API.Model;
using API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace UnitTest.ControllerTests;

public class DeliveryRouteControllerTest
{
    private static DeliveryRouteController CreateController(
        AppDBContext context,
        IGeolocationService? geo = null,
        IRoutingService? routing = null) =>
        new DeliveryRouteController(context, geo ?? new FakeGeoService(), routing ?? new FakeRoutingService());

    private static async Task<AppDBContext> CreateContextWithData()
    {
        var context = new AppDBContext(new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.RouteStatuses.Add(new RouteStatus { Id = 1, Name = "Assigned" });
        context.StopStatuses.Add(new StopStatus { Id = 1, Name = "Scheduled" });
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
    public async Task GetDeliveryRoute_ReturnsOk_WhenRouteExists()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).GetDeliveryRoute(1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var dto = (DeliveryRouteDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(dto.Name, Is.EqualTo("Rute 1"));
    }

    [Test]
    public async Task GetDeliveryRoute_ReturnsNotFound_WhenRouteDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).GetDeliveryRoute(999);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundResult>());
    }

    [Test]
    public async Task GetUserRoutes_ReturnsOk_WithUsersRoutes()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).GetUserRoutes(1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var routes = (List<DeliveryRouteDto>)((OkObjectResult)result.Result!).Value!;
        Assert.That(routes, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task GetAllRoutes_ReturnsOk_WithAllRoutes()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).GetAllRoutes();

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var routes = (List<DeliveryRouteDto>)((OkObjectResult)result.Result!).Value!;
        Assert.That(routes, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task DeleteDeliveryRoute_ReturnsNoContent_WhenRouteExists()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).DeleteDeliveryRoute(1);

        // Assert
        Assert.That(result, Is.InstanceOf<NoContentResult>());
    }

    [Test]
    public async Task DeleteDeliveryRoute_ReturnsNotFound_WhenRouteDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).DeleteDeliveryRoute(999);

        // Assert
        Assert.That(result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task CreateDeliveryRoute_ReturnsBadRequest_WhenNoStops()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - ingen stops i DTO
        var result = await CreateController(context).CreateDeliveryRoute(new CreateDeliveryRouteDto
        {
            Name = "Test",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Today),
            UserId = 1,
            Stops = []
        });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task CreateDeliveryRoute_ReturnsNotFound_WhenUserDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - bruger-ID eksisterer ikke
        var result = await CreateController(context).CreateDeliveryRoute(new CreateDeliveryRouteDto
        {
            Name = "Test",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Today),
            UserId = 999,
            Stops = [new CreateStopDto { Address = "Testvej 1" }]
        });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task CreateDeliveryRoute_ReturnsBadRequest_WhenGeocodingFails()
    {
        // Arrange - geocoding kan ikke finde adressen
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context, geo: new FakeGeoService(returnCoords: false))
            .CreateDeliveryRoute(new CreateDeliveryRouteDto
            {
                Name = "Test",
                ScheduledDate = DateOnly.FromDateTime(DateTime.Today),
                UserId = 1,
                Stops = [new CreateStopDto { Address = "Ukendt Adresse" }]
            });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task CreateDeliveryRoute_ReturnsCreated_WhenValid()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - ét stop, geocoding og routing virker
        var result = await CreateController(context).CreateDeliveryRoute(new CreateDeliveryRouteDto
        {
            Name = "Ny Rute",
            ScheduledDate = DateOnly.FromDateTime(DateTime.Today),
            UserId = 1,
            Stops = [new CreateStopDto { Address = "Rådhuspladsen, København" }]
        });

        // Assert
        Assert.That(result.Result, Is.InstanceOf<CreatedAtActionResult>());
        var dto = (DeliveryRouteDto)((CreatedAtActionResult)result.Result!).Value!;
        Assert.That(dto.Name, Is.EqualTo("Ny Rute"));
    }

    [Test]
    public async Task GetAssignedRoutes_ReturnsNotFound_WhenUserDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).GetAssignedRoutes(999);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    [Test]
    public async Task AssignUserToRoute_ReturnsOk_WhenValid()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act - tildel bruger 1 til rute 1
        var result = await CreateController(context).AssignUserToRoute(1, 1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var dto = (DeliveryRouteDto)((OkObjectResult)result.Result!).Value!;
        Assert.That(dto.AssignedUserId, Is.EqualTo(1));
    }

    [Test]
    public async Task AssignUserToRoute_ReturnsNotFound_WhenRouteDoesNotExist()
    {
        // Arrange
        var context = await CreateContextWithData();

        // Act
        var result = await CreateController(context).AssignUserToRoute(999, 1);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<NotFoundObjectResult>());
    }

    // Fake implementations der simulerer services uden netværkskald
    private class FakeGeoService(bool returnCoords = true) : IGeolocationService
    {
        public Task<(double Latitude, double Longitude)?> GetCoordinatesFromAddressAsync(string address) =>
            Task.FromResult(returnCoords ? ((double, double)?)(55.6761, 12.5683) : null);
    }

    private class FakeRoutingService : IRoutingService
    {
        public Task<RouteOptimizationResult?> OptimizeRouteAsync(
            List<(double Latitude, double Longitude)> coordinates) =>
            Task.FromResult<RouteOptimizationResult?>(new RouteOptimizationResult
            {
                TotalDistanceKm = 10,
                EstimatedDurationMinutes = 30,
                OptimizedOrder = Enumerable.Range(0, coordinates.Count).ToList()
            });

        public Task<List<(double Latitude, double Longitude)>?> GetRoadGeometryAsync(
            List<(double Latitude, double Longitude)> coordinates) =>
            Task.FromResult<List<(double Latitude, double Longitude)>?>(null);
    }
}
