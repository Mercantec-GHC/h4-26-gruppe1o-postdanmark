namespace API.Model;

public class Stop : Common
{
    public required string Address { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public int SequenceOrder { get; set; }

    public int RouteId { get; set; }
    public Route? Route { get; set; }

    public int StopStatusId { get; set; }
    public StopStatus? Status { get; set; }
}
