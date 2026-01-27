using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Services;
using API.Service;
using API.Model;
using API.Data;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly JwtService _jwtService;
    
    public AuthController(AppDBContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto registerDto)
    {
        // Validate model
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Tjekker om email allerede eksisterer
        if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
        {
            return BadRequest(new { message = "Email er allerede i brug." });
        }

        // Tjekker om brugernavn allerede eksisterer
        if (await _context.Users.AnyAsync(u => u.Name == registerDto.Name))
        {
            return BadRequest(new { message = "Brugernavn er allerede i brug." });
        }

        // Hash password
        var hashedPassword = PasswordHelper.CreatePasswordHashString(registerDto.Password);

        // Opret ny bruger med standardrolle "Employee"
        var user = new User
        {
            Name = registerDto.Name,
            Email = registerDto.Email,
            Password = hashedPassword,
            RoleId = 1, // Default Employee rolle
            LastLogin = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Load rollen for brugeren
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        // Generer JWT token
        var token = _jwtService.GenerateToken(user);

        return Ok(new
        {
            message = "Bruger registreret succesfuldt.",
            token,
            user = new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                role = user.Role.Name
            }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginUserDto loginDto)
    {
        // Validate model
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Find bruger med email
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

        if (user == null)
        {
            return Unauthorized(new { message = "Ugyldig email eller adgangskode." });
        }

        // Verificer password
        if (!PasswordHelper.VerifyPassword(loginDto.Password, user.Password))
        {
            return Unauthorized(new { message = "Ugyldig email eller adgangskode." });
        }

        // Opdater sidste login
        user.LastLogin = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Generer JWT token
        var token = _jwtService.GenerateToken(user);

        return Ok(new
        {
            message = "Login succesfuldt.",
            token,
            user = new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                role = user.Role.Name
            }
        });
    }
}


