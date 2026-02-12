using System.Text.Json;
using System.Text.Json.Serialization;

namespace API.Services;

/// <summary>
/// Interface til geolokationstjeneste der konverterer adresser til koordinater
/// </summary>
public interface IGeolocationService //definerer en kontrakt for geolocation service der kan hente koordinater fra en adresse
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
public class GeolocationService : IGeolocationService //implementerer IGeolocationService og bruger Nominatim API til at hente koordinater fra en adresse
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GeolocationService> _logger;

    //Constructor. Når programmet starter, vil dependency injection systemet automatisk oprette en HttpClient og en logger og sende dem ind i denne constructor, så vi kan bruge dem i vores service
    public GeolocationService(HttpClient httpClient, ILogger<GeolocationService> logger) 
    {
        _httpClient = httpClient; 
        _logger = logger;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "PostDanmarkAPI/1.0"); //fortæller Nominatim hvem vi er, for at undgå at blive blokeret
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
            var encodedAddress = Uri.EscapeDataString(address); // Speciel tegn og mellemrum skal kodes for at fungere i URL
            var url = $"https://nominatim.openstreetmap.org/search?q={encodedAddress}&format=json&limit=1&countrycodes=dk"; //bygger URL til Nominatim API med adresse og begrænsning til Danmark

            _logger.LogInformation("Geocoding address: {Address}, URL: {Url}", address, url);

            var response = await _httpClient.GetAsync(url); //forespørgsel til Nominatim API
            response.EnsureSuccessStatusCode(); // Kaster en undtagelse hvis statuskoden ikke er 2xx

            var content = await response.Content.ReadAsStringAsync(); //læser svaret fra server som rå tekst
            _logger.LogDebug("Nominatim response: {Response}", content);
            
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true }; // Nominatim returnerer lat/lon som strings, så vi skal tillade det i deserialiseringen
            var results = JsonSerializer.Deserialize<List<NominatimResult>>(content, options); //deserialiserer JSON-svaret til en liste af NominatimResult objekter

            if (results != null && results.Count > 0) //hvis listen ikke er tom tager vi det første resultat og returnerer lat og lon som en tuple
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
    
    // Nominatim API returnerer lat og lon som strings, så vi skal tillade det i deserialiseringen ved at bruge JsonNumberHandling.AllowReadingFromString

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
