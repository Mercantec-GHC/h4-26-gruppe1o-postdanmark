namespace API.Model;

//Er en status for en rute, f.eks. "Planlagt", "I gang", "Fuldført"
public class RouteStatus : Common
{
    public required string Name { get; set; }
    public List<Route> Routes { get; set; } = new();
}
