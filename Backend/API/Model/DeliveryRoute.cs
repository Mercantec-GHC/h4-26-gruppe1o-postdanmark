namespace API.Model;

//En rute tilhører en User og indeholder flere stoppesteder og har en status om den er planlagt, i gang eller fuldført.
public class DeliveryRoute : Common
{
    public string? Name { get; set; }
    public DateOnly ScheduledDate { get; set; }
    public double TotalDistanceKm { get; set; }
    public double EstimatedDurationMinutes { get; set; }

    public int UserId { get; set; } // Foreign key til User, som ejer ruten
    public User? User { get; set; } // Navigation property til User, som ejer ruten

    public int RouteStatusId { get; set; } // Foreign key til RouteStatus
    public RouteStatus? Status { get; set; } // Navigation property til RouteStatus

    public List<Stop> Stops { get; set; } = new(); // Navigation property til Stop, en rute har mange stoppesteder
    
    public int? AssignedUserId { get; set; } //FK til den bruger, som er tildelt ruten
    public User? AssignedUser { get; set; } //NP til den bruger, som er tildelt ruten
}

public class DeliveryRouteDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public DateOnly ScheduledDate { get; set; }
    public double TotalDistanceKm { get; set; }
    public double EstimatedDurationMinutes { get; set; }
    public int UserId { get; set; } // Id på den bruger, som har oprettet ruten
    public int? AssignedUserId { get; set; } 
    public string? AssignedUserName { get; set; } 
    public int RouteStatusId { get; set; }
    public string? StatusName { get; set; }
    public List<StopDto> Stops { get; set; } = new();
}

// DTO til oprettelse af en ny leveringsrute. 
// Admin sender en liste af adresser, som sendes til geocoding service for at få lat/long,
// og derefter til routing service (f.eks. Google Directions API) for at optimere rækkefølgen,
// beregne total distance og estimeret tid. Resultatet gemmes som en komplet DeliveryRoute med Stops.
//DeliveryRoute hentes i frontend via en separat GET request efter oprettelse og leaflet viser ruten på kortet.
public class CreateDeliveryRouteDto
{
    public required string Name { get; set; }
    public required DateOnly ScheduledDate { get; set; }
    public required int UserId { get; set; }
    public int? AssignedUserId { get; set; }
    public List<CreateStopDto> Stops { get; set; } = new();
}


