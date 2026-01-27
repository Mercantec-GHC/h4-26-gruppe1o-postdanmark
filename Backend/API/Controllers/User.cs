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
        var users = await _context.Users
            .Include(u => u.Role)
            .ToListAsync();

        var userDtos = users.Select(user => new GetUserDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            CreatedAt = user.CreatedAt,
            Role = new RoleDto
            {
                Id = user.Role.Id,
                Name = user.Role.Name
            }
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
                Id = user.Role.Id,
                Name = user.Role.Name
            }
        };

        return Ok(userDto);
    }
}