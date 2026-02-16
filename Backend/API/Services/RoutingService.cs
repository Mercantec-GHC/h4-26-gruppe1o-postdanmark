using System.Text.Json;
using System.Text.Json.Serialization;

namespace API.Services;

/// <summary>
/// Resultat fra ruteoptimering med afstand, varighed og optimeret rækkefølge
/// </summary>
public class RouteOptimizationResult
{
    public double TotalDistanceKm { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    /// <summary>
    /// Optimeret rækkefølge af waypoint indekser (0-baseret)
    /// </summary>
    public List<int> OptimizedOrder { get; set; } = new();
    public string? Error { get; set; }
    public bool Success => string.IsNullOrEmpty(Error);
}

/// <summary>
/// Interface til routing service der beregner afstand og varighed mellem stoppesteder
/// </summary>
public interface IRoutingService
{
    /// <summary>
    /// Beregn optimal rute med hurtigste rækkefølge (Traveling Salesman Problem)
    /// </summary>
    /// <param name="coordinates">Liste af koordinater (latitude, longitude)</param>
    /// <returns>RouteOptimizationResult med distance, varighed og optimeret rækkefølge</returns>
    Task<RouteOptimizationResult?> OptimizeRouteAsync(List<(double Latitude, double Longitude)> coordinates);

    /// <summary>
    /// Hent vejgeometri mellem stoppesteder (kørerute ad vejene, hurtigste rute, undgå færger når muligt).
    /// </summary>
    /// <param name="coordinates">Liste af koordinater (latitude, longitude) i rækkefølge</param>
    /// <returns>Liste af (lat, lon) punkter der beskriver ruten, eller null ved fejl</returns>
    Task<List<(double Latitude, double Longitude)>?> GetRoadGeometryAsync(List<(double Latitude, double Longitude)> coordinates);
}

/// <summary>
/// Service til beregning og optimering af ruter ved hjælp af OSRM (Open Source Routing Machine) API
/// </summary>
public class RoutingService : IRoutingService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RoutingService> _logger;
    private const string OsrmBaseUrl = "http://router.project-osrm.org";

    public RoutingService(HttpClient httpClient, ILogger<RoutingService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "PostDanmarkAPI/1.0");
    }

    /// <summary>
    /// Beregn optimal rute med hurtigste rækkefølge (Traveling Salesman Problem)
    /// Bruger OSRM trip endpoint til at finde den optimale rækkefølge
    /// </summary>
    public async Task<RouteOptimizationResult?> OptimizeRouteAsync(List<(double Latitude, double Longitude)> coordinates)
    {
        if (coordinates == null || coordinates.Count < 2)
        {
            _logger.LogWarning("Mindst 2 koordinater er påkrævet for at beregne en rute");
            return new RouteOptimizationResult
            {
                TotalDistanceKm = 0,
                EstimatedDurationMinutes = 0,
                OptimizedOrder = coordinates?.Select((_, i) => i).ToList() ?? new List<int>()
            };
        }

        try
        {
            // OSRM bruger format: lon,lat;lon,lat;...
            var coordinatesString = string.Join(";", 
                coordinates.Select(c => $"{c.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)},{c.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}"));
            
            // Brug trip endpoint til TSP optimering
            // roundtrip=false: ikke returnere til start
            // source=first: start fra første koordinat
            var url = $"{OsrmBaseUrl}/trip/v1/driving/{coordinatesString}?roundtrip=false&source=first&overview=false";
            
            _logger.LogInformation("Optimizing route for {Count} stops, URL: {Url}", coordinates.Count, url);

            var response = await _httpClient.GetAsync(url);
            
            _logger.LogInformation("OSRM response status: {StatusCode}", response.StatusCode);
            
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("OSRM response content length: {Length}", content.Length);

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var result = JsonSerializer.Deserialize<OsrmTripResponse>(content, options);

            _logger.LogInformation("OSRM parsed result - Code: {Code}, Trips count: {Count}, Waypoints count: {WpCount}", 
                result?.Code, result?.Trips?.Count ?? 0, result?.Waypoints?.Count ?? 0);

            if (result?.Code == "Ok" && result.Trips != null && result.Trips.Count > 0)
            {
                var trip = result.Trips[0];
                _logger.LogInformation("Raw OSRM values - Distance: {Distance}m, Duration: {Duration}s", 
                    trip.Distance, trip.Duration);
                    
                var distanceKm = Math.Round(trip.Distance / 1000.0, 2);
                var durationMinutes = (int)Math.Ceiling(trip.Duration / 60.0);

                // Hent optimeret rækkefølge fra waypoints
                // waypoint_index angiver positionen i den optimerede rute
                // Vi skal mappe: position i optimeret rute -> original input index
                var optimizedOrder = result.Waypoints?
                    .Select((w, originalIndex) => (w.WaypointIndex, originalIndex))
                    .OrderBy(x => x.WaypointIndex)
                    .Select(x => x.originalIndex)
                    .ToList() ?? coordinates.Select((_, i) => i).ToList();

                _logger.LogInformation("Route optimized: {Distance} km, {Duration} minutes, Order: [{Order}]", 
                    distanceKm, durationMinutes, string.Join(", ", optimizedOrder));

                return new RouteOptimizationResult
                {
                    TotalDistanceKm = distanceKm,
                    EstimatedDurationMinutes = durationMinutes,
                    OptimizedOrder = optimizedOrder
                };
            }

            _logger.LogWarning("OSRM returned no valid route. Code: {Code}", result?.Code);
            return new RouteOptimizationResult { Error = $"OSRM returned invalid response. Code: {result?.Code}" };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fejl ved optimering af rute");
            return new RouteOptimizationResult { Error = $"Exception: {ex.Message}" };
        }
    }

    /// <summary>
    /// Hent vejgeometri ved at kalde OSRM route API for hvert segment (A→B, B→C, ...).
    /// Hurtigste kørerute; exclude=ferry bruges hvis serveren understøtter det.
    /// </summary>
    public async Task<List<(double Latitude, double Longitude)>?> GetRoadGeometryAsync(List<(double Latitude, double Longitude)> coordinates)
    {
        if (coordinates == null || coordinates.Count < 2)
            return coordinates?.ToList();

        var all = new List<(double Latitude, double Longitude)>();

        for (int i = 0; i < coordinates.Count - 1; i++)
        {
            var from = coordinates[i];
            var to = coordinates[i + 1];
            var coordsStr = $"{from.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)},{from.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)};{to.Longitude.ToString(System.Globalization.CultureInfo.InvariantCulture)},{to.Latitude.ToString(System.Globalization.CultureInfo.InvariantCulture)}";
            var url = $"{OsrmBaseUrl}/route/v1/driving/{coordsStr}?overview=full&geometries=geojson&exclude=ferry";

            try
            {
                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    url = $"{OsrmBaseUrl}/route/v1/driving/{coordsStr}?overview=full&geometries=geojson";
                    response = await _httpClient.GetAsync(url);
                }

                if (!response.IsSuccessStatusCode)
                    return null;

                var content = await response.Content.ReadAsStringAsync();
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<OsrmRouteResponse>(content, options);

                var route = result?.Routes?.FirstOrDefault();
                if (route?.Geometry?.Coordinates == null || route.Geometry.Coordinates.Count == 0)
                    return null;

                var segment = route.Geometry.Coordinates
                    .Select(c => (Latitude: c[1], Longitude: c[0]))
                    .ToList();
                if (i > 0 && segment.Count > 0)
                    segment.RemoveAt(0);
                all.AddRange(segment);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OSRM segment request failed for segment {I}", i);
                return null;
            }
        }

        return all.Count > 0 ? all : null;
    }

    private class OsrmRouteResponse
    {
        [JsonPropertyName("routes")]
        public List<OsrmRoute>? Routes { get; set; }
    }

    private class OsrmRoute
    {
        [JsonPropertyName("geometry")]
        public OsrmGeometry? Geometry { get; set; }
    }

    private class OsrmGeometry
    {
        [JsonPropertyName("coordinates")]
        public List<double[]> Coordinates { get; set; } = new();
    }

    private class OsrmTripResponse
    {
        [JsonPropertyName("code")]
        public string? Code { get; set; }

        [JsonPropertyName("trips")]
        public List<OsrmTrip>? Trips { get; set; }

        [JsonPropertyName("waypoints")]
        public List<OsrmWaypoint>? Waypoints { get; set; }
    }

    private class OsrmTrip
    {
        [JsonPropertyName("distance")]
        public double Distance { get; set; }

        [JsonPropertyName("duration")]
        public double Duration { get; set; }
    }

    private class OsrmWaypoint
    {
        [JsonPropertyName("waypoint_index")]
        public int WaypointIndex { get; set; }

        [JsonPropertyName("trips_index")]
        public int TripsIndex { get; set; }
    }
}
