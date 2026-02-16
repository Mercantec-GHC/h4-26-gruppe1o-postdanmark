using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using API.Services;

namespace API.Controllers;

/// <summary>
/// API til vejgeometri (kørerute ad vejene) til brug på kortet.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoutingController : ControllerBase
{
    private readonly IRoutingService _routingService;

    public RoutingController(IRoutingService routingService)
    {
        _routingService = routingService;
    }

    /// <summary>
    /// Hent vejgeometri mellem en række koordinater (hurtigste kørerute, uden færger når muligt).
    /// </summary>
    [HttpPost("road-geometry")]
    public async Task<ActionResult<RoadGeometryResponse>> GetRoadGeometry([FromBody] RoadGeometryRequest request)
    {
        if (request?.Coordinates == null || request.Coordinates.Count < 2)
        {
            if (request?.Coordinates != null && request.Coordinates.Count == 1)
                return Ok(new RoadGeometryResponse { Coordinates = request.Coordinates });
            return BadRequest("Mindst 2 koordinater er påkrævet.");
        }

        var coords = request.Coordinates
            .Select(c => (c.Latitude, c.Longitude))
            .ToList();

        var geometry = await _routingService.GetRoadGeometryAsync(coords);
        if (geometry == null)
            return Ok(new RoadGeometryResponse { Coordinates = request.Coordinates }); // fallback til lige linje

        return Ok(new RoadGeometryResponse
        {
            Coordinates = geometry.Select(p => new CoordDto { Latitude = p.Latitude, Longitude = p.Longitude }).ToList()
        });
    }
}

public class CoordDto
{
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class RoadGeometryRequest
{
    public List<CoordDto> Coordinates { get; set; } = new();
}

public class RoadGeometryResponse
{
    public List<CoordDto> Coordinates { get; set; } = new();
}
