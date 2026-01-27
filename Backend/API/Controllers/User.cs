using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Data;
using API.Model;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly AppDBContext _context;

    public UserController(AppDBContext context)
    {
        _context = context;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
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

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<GetUserDto>> GetUserById(int id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
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
            }
        };

        return Ok(userDto);
    }
}