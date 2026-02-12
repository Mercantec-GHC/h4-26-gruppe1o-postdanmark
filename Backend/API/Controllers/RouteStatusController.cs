using API.Data;
using API.Model;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RouteStatusController : ControllerBase
{
    private readonly AppDBContext _context;

    public RouteStatusController(AppDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Hent alle tilgængelige rute-statusser
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<RouteStatusDto>>> GetAllRouteStatuses()
    {
        var statuses = await _context.RouteStatuses.ToListAsync();

        var dtos = statuses.Select(s => new RouteStatusDto
        {
            Name = s.Name
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Hent den aktuelle status for en specifik leveringsrute
    /// </summary>
    [HttpGet("route/{routeId}")]
    public async Task<ActionResult<RouteStatusDto>> GetRouteStatus(int routeId)
    {
        var route = await _context.DeliveryRoutes
            .Include(r => r.Status)
            .FirstOrDefaultAsync(r => r.Id == routeId);

        if (route == null)
        {
            return NotFound($"Rute med ID {routeId} blev ikke fundet");
        }

        var dto = new RouteStatusDto
        {
            Name = route.Status?.Name ?? "Ukendt"
        };

        return Ok(dto);
    }

    /// <summary>
    /// Opdater status for en specifik leveringsrute. Brug seeded værdier: 1 = Pending, 2 = Assigned, 3 = Active, 4 = Completed, 5 = Cancelled
    /// </summary>
    [HttpPut("route/{routeId}")]
    public async Task<ActionResult<DeliveryRouteDto>> UpdateRouteStatus(int routeId, [FromBody] UpdateRouteStatusDto dto)
    {
        var route = await _context.DeliveryRoutes
            .Include(r => r.Status)
            .Include(r => r.Stops)
            .ThenInclude(s => s.Status)
            .FirstOrDefaultAsync(r => r.Id == routeId);

        if (route == null)
        {
            return NotFound($"Rute med ID {routeId} blev ikke fundet");
        }

        var newStatus = await _context.RouteStatuses.FindAsync(dto.RouteStatusId);
        if (newStatus == null)
        {
            return BadRequest($"RouteStatus med ID {dto.RouteStatusId} blev ikke fundet");
        }

        route.RouteStatusId = dto.RouteStatusId;
        route.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var resultDto = new DeliveryRouteDto
        {
            Id = route.Id,
            Name = route.Name,
            ScheduledDate = route.ScheduledDate,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            AssignedUserId = route.AssignedUserId,
            RouteStatusId = route.RouteStatusId,
            StatusName = newStatus.Name,
            Stops = route.Stops.OrderBy(s => s.SequenceOrder).Select(s => new StopDto
            {
                Address = s.Address,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                Sequence = s.SequenceOrder,
                Status = s.Status != null ? new StopStatusDto { Name = s.Status.Name } : null
            }).ToList()
        };

        return Ok(resultDto);
    }
}
