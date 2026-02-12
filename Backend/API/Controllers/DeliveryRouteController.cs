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
    private readonly IRoutingService _routingService;

    public DeliveryRouteController(
        AppDBContext context,
        IGeolocationService geolocationService,
        IRoutingService routingService)
    {
        _context = context;
        _geolocationService = geolocationService;
        _routingService = routingService;
    }

    /// <summary>
    /// Opret en ny leveringsrute med stoppesteder. Adresser bliver automatisk geokodet til koordinater.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
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

        // Geokod alle adresser for at få koordinater (uden sequence endnu)
        var stopsWithCoords = new List<(Stop Stop, int OriginalIndex)>();
        
        // Hent standard "Scheduled" status én gang
        var defaultStatus = await _context.StopStatuses.FirstOrDefaultAsync(s => s.Name == "Scheduled")
            ?? await _context.StopStatuses.FirstAsync();
            
        for (int i = 0; i < dto.Stops.Count; i++)
        {
            var stopDto = dto.Stops[i];
            var coordinates = await _geolocationService.GetCoordinatesFromAddressAsync(stopDto.Address);

            if (coordinates == null)
            {
                return BadRequest($"Kunne ikke geokode adresse: {stopDto.Address}");
            }

            stopsWithCoords.Add((new Stop
            {
                Address = stopDto.Address,
                Latitude = coordinates.Value.Latitude,
                Longitude = coordinates.Value.Longitude,
                SequenceOrder = 0, // Sættes efter optimering
                StopStatusId = defaultStatus.Id
            }, i));
        }

        // Hent standard "Assigned" rute status
        var routeStatus = await _context.RouteStatuses.FirstOrDefaultAsync(s => s.Name == "Assigned")
            ?? await _context.RouteStatuses.FirstAsync();

        // Optimer rute og beregn afstand/varighed
        double totalDistanceKm = 0;
        int estimatedDurationMinutes = 0;
        var stops = new List<Stop>();

        if (stopsWithCoords.Count >= 2)
        {
            var coordinates = stopsWithCoords
                .Select(s => (s.Stop.Latitude, s.Stop.Longitude))
                .ToList();

            var routeResult = await _routingService.OptimizeRouteAsync(coordinates);

            if (routeResult != null && routeResult.Success)
            {
                totalDistanceKm = routeResult.TotalDistanceKm;
                estimatedDurationMinutes = routeResult.EstimatedDurationMinutes;
                
                // Anvend optimeret rækkefølge
                for (int seq = 0; seq < routeResult.OptimizedOrder.Count; seq++)
                {
                    var originalIndex = routeResult.OptimizedOrder[seq];
                    var stop = stopsWithCoords[originalIndex].Stop;
                    stop.SequenceOrder = seq + 1;
                    stops.Add(stop);
                }
                
            }
            else
            {
                // Fallback: brug original rækkefølge
                for (int i = 0; i < stopsWithCoords.Count; i++)
                {
                    stopsWithCoords[i].Stop.SequenceOrder = i + 1;
                    stops.Add(stopsWithCoords[i].Stop);
                }
            }
        }
        else
        {
            // Kun ét stop - ingen optimering nødvendig
            stopsWithCoords[0].Stop.SequenceOrder = 1;
            stops.Add(stopsWithCoords[0].Stop);
        }

        // Verificer at assigned bruger eksisterer (hvis angivet)
        if (dto.AssignedUserId.HasValue)
        {
            var assignedUserExists = await _context.Users.AnyAsync(u => u.Id == dto.AssignedUserId.Value);
            if (!assignedUserExists)
            {
                return NotFound($"Tildelt bruger med ID {dto.AssignedUserId.Value} blev ikke fundet");
            }
        }

        // Opret leveringsrute
        var route = new DeliveryRoute
        {
            Name = dto.Name,
            ScheduledDate = dto.ScheduledDate,
            UserId = dto.UserId,
            AssignedUserId = dto.AssignedUserId,
            RouteStatusId = routeStatus.Id,
            Stops = stops,
            TotalDistanceKm = totalDistanceKm,
            EstimatedDurationMinutes = estimatedDurationMinutes
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
            Id = route.Id,
            Name = route.Name,
            ScheduledDate = route.ScheduledDate,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            AssignedUserId = route.AssignedUserId,

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
            Id = route.Id,
            Name = route.Name,
            ScheduledDate = route.ScheduledDate,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            AssignedUserId = route.AssignedUserId,

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
            Id = route.Id,
            Name = route.Name,
            ScheduledDate = route.ScheduledDate,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            AssignedUserId = route.AssignedUserId,

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

    /// <summary>
    /// Hent alle leveringsruter
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<DeliveryRouteDto>>> GetAllRoutes()
    {
        var routes = await _context.DeliveryRoutes
            .Include(r => r.Status)

            .Include(r => r.Stops)
            .ThenInclude(s => s.Status)
            .ToListAsync();

        var dtos = routes.Select(route => new DeliveryRouteDto
        {
            Id = route.Id,
            Name = route.Name,
            ScheduledDate = route.ScheduledDate,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            AssignedUserId = route.AssignedUserId,

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

    /// <summary>
    /// Tildel en bruger til en eksisterende leveringsrute
    /// </summary>
    [HttpPut("{id}/assign")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<DeliveryRouteDto>> AssignUserToRoute(int id, [FromBody] int assignedUserId)
    {
        var route = await _context.DeliveryRoutes
            .Include(r => r.Status)
            .Include(r => r.Stops)
            .ThenInclude(s => s.Status)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (route == null)
        {
            return NotFound($"Rute med ID {id} blev ikke fundet");
        }

        var assignedUser = await _context.Users.FindAsync(assignedUserId);
        if (assignedUser == null)
        {
            return NotFound($"Bruger med ID {assignedUserId} blev ikke fundet");
        }

        route.AssignedUserId = assignedUserId;
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

        return Ok(resultDto);
    }

    /// <summary>
    /// Hent alle leveringsruter tildelt en specifik bruger (medarbejder)
    /// </summary>
    [HttpGet("assigned/{userId}")]
    public async Task<ActionResult<List<DeliveryRouteDto>>> GetAssignedRoutes(int userId)
    {
        var userExists = await _context.Users.AnyAsync(u => u.Id == userId);
        if (!userExists)
        {
            return NotFound($"Bruger med ID {userId} blev ikke fundet");
        }

        var routes = await _context.DeliveryRoutes
            .Include(r => r.Status)

            .Include(r => r.Stops)
            .ThenInclude(s => s.Status)
            .Where(r => r.AssignedUserId == userId)
            .ToListAsync();

        var dtos = routes.Select(route => new DeliveryRouteDto
        {
            Id = route.Id,
            Name = route.Name,
            ScheduledDate = route.ScheduledDate,
            TotalDistanceKm = route.TotalDistanceKm,
            EstimatedDurationMinutes = route.EstimatedDurationMinutes,
            UserId = route.UserId,
            AssignedUserId = route.AssignedUserId,

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
