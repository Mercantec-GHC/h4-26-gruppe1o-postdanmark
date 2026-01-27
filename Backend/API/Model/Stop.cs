namespace API.Model;

// Indeholder adresse, lat/long, sequence
// Tilhører en DeliveryRoute
// Har en StopStatus
public class Stop : Common
{
    public required string Address { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int SequenceOrder { get; set; }

    public int RouteId { get; set; }
    public DeliveryRoute? Route { get; set; }

    public int StopStatusId { get; set; } 
    public StopStatus? Status { get; set; } 
}

public class StopDto
{
    public string Address { get; set; } = null!;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int Sequence { get; set; }
    public StopStatusDto? Status { get; set; }
}

//Denne dto skal med adresse gøre brug af geocoding service til at få lat og long samt sequence
public class CreateStopDto
{
    public required string Address { get; set; }
}