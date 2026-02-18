using System.Net;
using API.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace UnitTest.ServicesTests;

public class GeolocationServiceTest
{
    // Fake HttpMessageHandler der returnerer et foruddefineret svar uden at ramme netværket
    private static GeolocationService CreateService(string jsonResponse, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        var handler = new FakeHttpMessageHandler(jsonResponse, statusCode);
        var httpClient = new HttpClient(handler);
        var logger = NullLogger<GeolocationService>.Instance;
        return new GeolocationService(httpClient, logger);
    }

    [Test]
    public async Task GetCoordinates_ReturnsCorrectCoordinates_WhenAddressFound()
    {
        // Arrange - simuler et gyldigt svar fra Nominatim API
        var service = CreateService("""
            [{"lat": "55.6761", "lon": "12.5683"}]
            """);

        // Act
        var result = await service.GetCoordinatesFromAddressAsync("Rådhuspladsen, København");

        // Assert - koordinaterne skal svare til det simulerede svar
        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Value.Latitude, Is.EqualTo(55.6761).Within(0.0001));
        Assert.That(result!.Value.Longitude, Is.EqualTo(12.5683).Within(0.0001));
    }

    [Test]
    public async Task GetCoordinates_ReturnsNull_WhenNoResultsFound()
    {
        // Arrange - Nominatim returnerer en tom liste når adressen ikke kendes
        var service = CreateService("[]");

        // Act
        var result = await service.GetCoordinatesFromAddressAsync("Ukendt Adresse 999");

        // Assert - null når der ikke er resultater
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task GetCoordinates_ReturnsNull_WhenHttpRequestFails()
    {
        // Arrange - server returnerer 500 Internal Server Error
        var service = CreateService("", HttpStatusCode.InternalServerError);

        // Act - EnsureSuccessStatusCode kaster exception som fanges og returnerer null
        var result = await service.GetCoordinatesFromAddressAsync("Testvej 1");

        // Assert
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task GetCoordinates_ReturnsNull_WhenResponseIsInvalidJson()
    {
        // Arrange - ugyldig JSON som ikke kan deserialiseres
        var service = CreateService("not valid json at all");

        // Act
        var result = await service.GetCoordinatesFromAddressAsync("Testvej 1");

        // Assert - exception fanges og returnerer null
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task GetCoordinates_UsesFirstResult_WhenMultipleResultsReturned()
    {
        // Arrange - Nominatim returnerer flere resultater; vi skal bruge det første
        var service = CreateService("""
            [
                {"lat": "55.6761", "lon": "12.5683"},
                {"lat": "56.1572", "lon": "10.2107"}
            ]
            """);

        // Act
        var result = await service.GetCoordinatesFromAddressAsync("Rådhuspladsen");

        // Assert - kun det første resultat bruges
        Assert.That(result!.Value.Latitude, Is.EqualTo(55.6761).Within(0.0001));
        Assert.That(result!.Value.Longitude, Is.EqualTo(12.5683).Within(0.0001));
    }

    /// <summary>
    /// Fake HttpMessageHandler der returnerer et foruddefineret svar.
    /// Bruges til at teste HTTP-kald uden at ramme det rigtige netværk.
    /// </summary>
    private class FakeHttpMessageHandler(string responseBody, HttpStatusCode statusCode) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseBody)
            };
            return Task.FromResult(response);
        }
    }
}
