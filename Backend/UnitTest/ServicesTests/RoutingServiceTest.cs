using System.Net;
using System.Text;
using API.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;

namespace UnitTest.ServicesTests;

public class RoutingServiceTest
{
    [Test]
    public async Task OptimizeRoute_UnderTwoCoordinates_ReturnsZeroDistance()
    {
        // Arrange - opret den rigtige RoutingService med en mock logger
        var mockLogger = new Mock<ILogger<RoutingService>>();
        var service = new RoutingService(new HttpClient(), mockLogger.Object);

        // Kun 1 koordinat - det er for lidt til at beregne en rute
        var coordinates = new List<(double Latitude, double Longitude)>
        {
            (55.6761, 12.5683)
        };

        // Act - kald den rigtige service
        var result = await service.OptimizeRouteAsync(coordinates);

        // Assert - med færre end 2 punkter skal distance og varighed være 0
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.TotalDistanceKm, Is.EqualTo(0));
        Assert.That(result.EstimatedDurationMinutes, Is.EqualTo(0));
    }

    [Test]
    public async Task OptimizeRoute_ThreeStops_ReturnsOptimizedOrder()
    {
        // Arrange - fake OSRM JSON svar hvor den optimale rækkefølge er: stop 0 → stop 2 → stop 1
        // waypoint_index fortæller hvilken position i den optimerede rute hvert stop har
        var fakeOsrmJson = """
        {
            "code": "Ok",
            "trips": [{ "distance": 25000, "duration": 1800 }],
            "waypoints": [
                { "waypoint_index": 0, "trips_index": 0 },
                { "waypoint_index": 2, "trips_index": 0 },
                { "waypoint_index": 1, "trips_index": 0 }
            ]
        }
        """;

        // Mock HttpClient til at returnere vores fake JSON i stedet for at kalde OSRM API
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(fakeOsrmJson, Encoding.UTF8, "application/json")
            });

        var httpClient = new HttpClient(mockHandler.Object);
        var mockLogger = new Mock<ILogger<RoutingService>>();
        var service = new RoutingService(httpClient, mockLogger.Object);

        // 3 stoppesteder i København
        var coordinates = new List<(double Latitude, double Longitude)>
        {
            (55.6761, 12.5683),  // Stop 0 - Rådhuspladsen
            (55.6867, 12.5701),  // Stop 1 - Nørreport
            (55.6736, 12.5681)   // Stop 2 - Tivoli
        };

        // Act - kald servicen (den bruger vores fake HTTP svar)
        var result = await service.OptimizeRouteAsync(coordinates);

        // Assert - tjek at rækkefølgen er optimeret til: 0 → 2 → 1
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.OptimizedOrder, Is.EqualTo(new List<int> { 0, 2, 1 }));
        Assert.That(result.TotalDistanceKm, Is.EqualTo(25.0));
        Assert.That(result.EstimatedDurationMinutes, Is.EqualTo(30));
    }
}
