namespace API.Model;

//SKal bruge en liste af stops til at kunne markere flere stops. Fx stop 1 complete, stop 2 in progress osv.
public class StopStatus : Common
{
    public required string Name { get; set; }
    public List<Stop> Stops { get; set; } = new();
}

public class StopStatusDto
{
    public required string Name { get; set; }
}
