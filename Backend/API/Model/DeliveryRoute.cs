namespace API.Model;

//En rute indeholder flere stoppesteder og har en status om den er planlagt, i gang eller fuldført.
public class DeliveryRoute : Common
{
    public string? Name { get; set; }
    public double TotalDistanceKm { get; set; }
    public double EstimatedDurationMinutes { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    public int RouteStatusId { get; set; }
    public RouteStatus? Status { get; set; }

    public List<Stop> Stops { get; set; } = new();
}

public class DeliveryRouteDto
{
    public string? Name { get; set; }
    public double TotalDistanceKm { get; set; }
    public double EstimatedDurationMinutes { get; set; }
    public int UserId { get; set; }
    public int RouteStatusDto { get; set; }
    public List<StopDto> Stops { get; set; } = new();
}
