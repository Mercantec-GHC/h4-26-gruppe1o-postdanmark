using System.Text.Json;
using System.Text.Json.Serialization;

namespace API.Services;

/// <summary>
/// Interface til geolokationstjeneste der konverterer adresser til koordinater
/// </summary>
public interface IGeolocationService
{
    /// <summary>
    /// Hent koordinater (latitude og longitude) fra en adresse
    /// </summary>
    /// <param name="address">Adresse der skal geokoges</param>
    /// <returns>Tuple med (Latitude, Longitude) eller null hvis adressen ikke findes</returns>
    Task<(double Latitude, double Longitude)?> GetCoordinatesFromAddressAsync(string address);
}

/// <summary>
/// Service til geokodning af adresser ved hjælp af OpenStreetMap Nominatim API
/// </summary>
public class GeolocationService : IGeolocationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GeolocationService> _logger;

    public GeolocationService(HttpClient httpClient, ILogger<GeolocationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "PostDanmarkAPI/1.0");
    }

    /// <summary>
    /// Hent koordinater (latitude og longitude) fra en adresse ved hjælp af OpenStreetMap Nominatim API
    /// </summary>
    /// <param name="address">Adresse der skal geokoges</param>
    /// <returns>Tuple med (Latitude, Longitude) eller null hvis adressen ikke findes</returns>
    public async Task<(double Latitude, double Longitude)?> GetCoordinatesFromAddressAsync(string address)
    {
        try
        {
            var encodedAddress = Uri.EscapeDataString(address);
            var url = $"https://nominatim.openstreetmap.org/search?q={encodedAddress}&format=json&limit=1&countrycodes=dk";

            _logger.LogInformation("Geocoding address: {Address}, URL: {Url}", address, url);

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogDebug("Nominatim response: {Response}", content);
            
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var results = JsonSerializer.Deserialize<List<NominatimResult>>(content, options);

            if (results != null && results.Count > 0)
            {
                var result = results[0];
                _logger.LogInformation("Successfully geocoded {Address} to ({Lat}, {Lon})", address, result.Lat, result.Lon);
                return (result.Lat, result.Lon);
            }

            _logger.LogWarning("Ingen koordinater fundet for adresse: {Address}", address);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fejl ved hentning af koordinater for adresse: {Address}", address);
            return null;
        }
    }

    private class NominatimResult
    {
        [JsonPropertyName("lat")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public double Lat { get; set; }
        
        [JsonPropertyName("lon")]
        [JsonNumberHandling(JsonNumberHandling.AllowReadingFromString)]
        public double Lon { get; set; }
    }
}
