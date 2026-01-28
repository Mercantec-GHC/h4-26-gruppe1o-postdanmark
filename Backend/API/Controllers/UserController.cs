using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Model;

namespace API.Controllers;

/// <summary>
/// Controller til håndtering af brugerdata og forespørgsler.
/// Kun tilgængelig for Admin-brugere.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly AppDBContext _context;

    /// <summary>
    /// Initialiserer UserController med databasekontekst.
    /// </summary>
    /// <param name="context">Databasekontekst</param>
    public UserController(AppDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Henter alle brugere med tilhørende roller og ruter.
    /// Kun Admin-brugere har adgang.
    /// </summary>
    /// <returns>
    /// <para><b>200 OK:</b> Returnerer en liste af brugere med detaljer.</para>
    /// <para><b>401 Unauthorized:</b> Hvis brugeren ikke er logget ind.</para>
    /// <para><b>403 Forbidden:</b> Hvis brugeren ikke har Admin-rolle.</para>
    /// </returns>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<GetUserDto>>> GetAllUsers()
    {
        // Explicitly specify the type for the query to resolve the type inference issue.
        var users = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.DeliveryRoutes)
                .ThenInclude(r => r.Stops)
                    .ThenInclude(s => s.Status)
            .Include(u => u.DeliveryRoutes)
                .ThenInclude(r => r.Status)
            .ToListAsync<User>();

        var userDtos = users.Select(user => new GetUserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            CreatedAt = user.CreatedAt,
            Role = new RoleDto
            {
                
                Name = user.Role.Name
            },
            DeliveryRoutes = user.DeliveryRoutes.Select(route => new DeliveryRouteDto
            {
                Name = route.Name,
                TotalDistanceKm = route.TotalDistanceKm,
                EstimatedDurationMinutes = route.EstimatedDurationMinutes,
                UserId = route.UserId,
                RouteStatusId = route.RouteStatusId,
                StatusName = route.Status?.Name,
                Stops = route.Stops.Select(stop => new StopDto
                {
                    Address = stop.Address,
                    Latitude = stop.Latitude,
                    Longitude = stop.Longitude,
                    Sequence = stop.SequenceOrder,
                    Status = stop.Status != null ? new StopStatusDto
                    {
                        Name = stop.Status.Name
                    } : null
                }).ToList()
            }).ToList()
        }).ToList();

        return Ok(userDtos);
    }

    /// <summary>
    /// Henter en bruger baseret på ID.
    /// Kun Admin-brugere har adgang.
    /// </summary>
    /// <param name="id">Brugerens ID</param>
    /// <returns>
    /// <para><b>200 OK:</b> Returnerer brugerens detaljer.</para>
    /// <para><b>401 Unauthorized:</b> Hvis brugeren ikke er logget ind.</para>
    /// <para><b>403 Forbidden:</b> Hvis brugeren ikke har Admin-rolle.</para>
    /// <para><b>404 Not Found:</b> Hvis brugeren ikke findes.</para>
    /// </returns>
    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<GetUserDto>> GetUserById(int id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.DeliveryRoutes)
                .ThenInclude(r => r.Stops)
                    .ThenInclude(s => s.Status)
            .Include(u => u.DeliveryRoutes)
                .ThenInclude(r => r.Status)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
        {
            return NotFound(new { message = "Bruger ikke fundet." });
        }

        var userDto = new GetUserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            CreatedAt = user.CreatedAt,
            Role = new RoleDto
            {
                Name = user.Role.Name
            },
            DeliveryRoutes = user.DeliveryRoutes.Select(route => new DeliveryRouteDto
            {
                Name = route.Name,
                TotalDistanceKm = route.TotalDistanceKm,
                EstimatedDurationMinutes = route.EstimatedDurationMinutes,
                UserId = route.UserId,
                RouteStatusId = route.RouteStatusId,
                StatusName = route.Status?.Name,
                Stops = route.Stops.Select(stop => new StopDto
                {
                    Address = stop.Address,
                    Latitude = stop.Latitude,
                    Longitude = stop.Longitude,
                    Sequence = stop.SequenceOrder,
                    Status = stop.Status != null ? new StopStatusDto
                    {
                        Name = stop.Status.Name
                    } : null
                }).ToList()
            }).ToList()
        };

        return Ok(userDto);
    }
}