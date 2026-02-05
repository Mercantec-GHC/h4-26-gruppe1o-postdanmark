using API.Data;
using API.Model;
using API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DeliveryRouteController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly IGeolocationService _geolocationService;
    private readonly ILogger<DeliveryRouteController> _logger;

    public DeliveryRouteController(
        AppDBContext context,
        IGeolocationService geolocationService,
        ILogger<DeliveryRouteController> logger)
    {
        _context = context;
        _geolocationService = geolocationService;
        _logger = logger;
    }

    /// <summary>
    /// Opret en ny leveringsrute med stoppesteder. Adresser bliver automatisk geokodet til koordinater.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<DeliveryRouteDto>> CreateDeliveryRoute([FromBody] CreateDeliveryRouteDto dto)
    {
        if (dto.Stops == null || dto.Stops.Count == 0)
        {
            return BadRequest("Mindst ét stoppested er påkrævet");
        }

        // Verificer at bruger eksisterer
        var userExists = await _context.Users.AnyAsync(u => u.Id == dto.UserId);
        if (!userExists)
        {
            return NotFound($"Bruger med ID {dto.UserId} blev ikke fundet");
        }

        // Geokod alle adresser for at få koordinater
        var stops = new List<Stop>();
        for (int i = 0; i < dto.Stops.Count; i++)
        {
            var stopDto = dto.Stops[i];
            var coordinates = await _geolocationService.GetCoordinatesFromAddressAsync(stopDto.Address);

            if (coordinates == null)
            {
                return BadRequest($"Kunne ikke geokode adresse: {stopDto.Address}");
            }

            // Hent standard "Scheduled" status
            var defaultStatus = await _context.StopStatuses.FirstOrDefaultAsync(s => s.Name == "Scheduled")
                ?? await _context.StopStatuses.FirstAsync();

            stops.Add(new Stop
            {
                Address = stopDto.Address,
                Latitude = coordinates.Value.Latitude,
                Longitude = coordinates.Value.Longitude,
                SequenceOrder = i + 1,
                StopStatusId = defaultStatus.Id
            });
        }

        // Hent standard "Pending" rute status
        var routeStatus = await _context.RouteStatuses.FirstOrDefaultAsync(s => s.Name == "Pending")
            ?? await _context.RouteStatuses.FirstAsync();

        // Opret leveringsrute
        var route = new DeliveryRoute
        {
            Name = dto.Name,
            UserId = dto.UserId,
            RouteStatusId = routeStatus.Id,
            Stops = stops,
            TotalDistanceKm = 0, // TODO: Beregn med routing service
            EstimatedDurationMinutes = 0 // TODO: Beregn med routing service
        };

        _context.DeliveryRoutes.Add(route);
        await _context.SaveChangesAsync();

        // Indlæs relateret data
        await _context.Entry(route).Reference(r => r.Status).LoadAsync();
        await _context.Entry(route).Collection(r => r.Stops).LoadAsync();
        
        foreach (var stop in route.Stops)
        {
            await _context.Entry(stop).Reference(s => s.Status).LoadAsync();
        }

        // Map til DTO
        var resultDto = new DeliveryRouteDto
        {
            Name = route.Name,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            RouteStatusId = route.RouteStatusId,
            StatusName = route.Status?.Name,
            Stops = route.Stops.Select(s => new StopDto
            {
                Address = s.Address,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                Sequence = s.SequenceOrder,
                Status = s.Status != null ? new StopStatusDto { Name = s.Status.Name } : null
            }).ToList()
        };

        return CreatedAtAction(nameof(GetDeliveryRoute), new { id = route.Id }, resultDto);
    }

    /// <summary>
    /// Hent en leveringsrute via ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<DeliveryRouteDto>> GetDeliveryRoute(int id)
    {
        var route = await _context.DeliveryRoutes
            .Include(r => r.Status)
            .Include(r => r.Stops)
            .ThenInclude(s => s.Status)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (route == null)
        {
            return NotFound();
        }

        var dto = new DeliveryRouteDto
        {
            Name = route.Name,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            RouteStatusId = route.RouteStatusId,
            StatusName = route.Status?.Name,
            Stops = route.Stops.OrderBy(s => s.SequenceOrder).Select(s => new StopDto
            {
                Address = s.Address,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                Sequence = s.SequenceOrder,
                Status = s.Status != null ? new StopStatusDto { Name = s.Status.Name } : null
            }).ToList()
        };

        return Ok(dto);
    }

    /// <summary>
    /// Hent alle leveringsruter for en bruger
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<DeliveryRouteDto>>> GetUserRoutes(int userId)
    {
        var routes = await _context.DeliveryRoutes
            .Include(r => r.Status)
            .Include(r => r.Stops)
            .ThenInclude(s => s.Status)
            .Where(r => r.UserId == userId)
            .ToListAsync();

        var dtos = routes.Select(route => new DeliveryRouteDto
        {
            Name = route.Name,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            RouteStatusId = route.RouteStatusId,
            StatusName = route.Status?.Name,
            Stops = route.Stops.OrderBy(s => s.SequenceOrder).Select(s => new StopDto
            {
                Address = s.Address,
                Latitude = s.Latitude,
                Longitude = s.Longitude,
                Sequence = s.SequenceOrder,
                Status = s.Status != null ? new StopStatusDto { Name = s.Status.Name } : null
            }).ToList()
        }).ToList();

        return Ok(dtos);
    }
}
