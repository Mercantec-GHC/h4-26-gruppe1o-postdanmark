using API.Controllers;
using API.Services;
using Microsoft.AspNetCore.Mvc;

namespace UnitTest.ControllerTests;

public class RoutingControllerTest
{
    [Test]
    public async Task GetRoadGeometry_ReturnsBadRequest_WhenRequestIsNull()
    {
        // Arrange
        var controller = new RoutingController(new FakeRoutingService());

        // Act
        var result = await controller.GetRoadGeometry(null!);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task GetRoadGeometry_ReturnsBadRequest_WhenLessThanTwoCoords()
    {
        // Arrange - tom koordinatliste
        var controller = new RoutingController(new FakeRoutingService());

        // Act
        var result = await controller.GetRoadGeometry(new RoadGeometryRequest());

        // Assert
        Assert.That(result.Result, Is.InstanceOf<BadRequestObjectResult>());
    }

    [Test]
    public async Task GetRoadGeometry_ReturnsOk_WithSingleCoord()
    {
        // Arrange - 1 koordinat returneres som-is (ingen rute at tegne)
        var controller = new RoutingController(new FakeRoutingService());
        var request = new RoadGeometryRequest
        {
            Coordinates = [new CoordDto { Latitude = 55.67, Longitude = 12.56 }]
        };

        // Act
        var result = await controller.GetRoadGeometry(request);

        // Assert - returnerer den ene koordinat uændret
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var response = (RoadGeometryResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.Coordinates, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task GetRoadGeometry_ReturnsOk_WithGeometryFromService()
    {
        // Arrange - service returnerer vejgeometri
        var controller = new RoutingController(new FakeRoutingService(returnGeometry: true));
        var request = new RoadGeometryRequest
        {
            Coordinates =
            [
                new CoordDto { Latitude = 55.67, Longitude = 12.56 },
                new CoordDto { Latitude = 56.15, Longitude = 10.21 }
            ]
        };

        // Act
        var result = await controller.GetRoadGeometry(request);

        // Assert
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
    }

    [Test]
    public async Task GetRoadGeometry_ReturnsFallback_WhenServiceReturnsNull()
    {
        // Arrange - service returnerer null, controller falder tilbage til direkte linje
        var controller = new RoutingController(new FakeRoutingService(returnGeometry: false));
        var request = new RoadGeometryRequest
        {
            Coordinates =
            [
                new CoordDto { Latitude = 55.67, Longitude = 12.56 },
                new CoordDto { Latitude = 56.15, Longitude = 10.21 }
            ]
        };

        // Act
        var result = await controller.GetRoadGeometry(request);

        // Assert - originale koordinater returneres som fallback
        Assert.That(result.Result, Is.InstanceOf<OkObjectResult>());
        var response = (RoadGeometryResponse)((OkObjectResult)result.Result!).Value!;
        Assert.That(response.Coordinates, Has.Count.EqualTo(2));
    }

    private class FakeRoutingService(bool returnGeometry = false) : IRoutingService
    {
        public Task<RouteOptimizationResult?> OptimizeRouteAsync(
            List<(double Latitude, double Longitude)> coordinates) =>
            Task.FromResult<RouteOptimizationResult?>(null);

        public Task<List<(double Latitude, double Longitude)>?> GetRoadGeometryAsync(
            List<(double Latitude, double Longitude)> coordinates)
        {
            if (!returnGeometry)
                return Task.FromResult<List<(double Latitude, double Longitude)>?>(null);

            return Task.FromResult<List<(double Latitude, double Longitude)>?>(
                coordinates.Select(c => (c.Latitude, c.Longitude)).ToList());
        }
    }
}
