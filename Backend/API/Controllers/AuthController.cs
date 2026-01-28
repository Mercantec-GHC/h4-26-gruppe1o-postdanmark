using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using API.Services;
using API.Service;
using API.Model;
using API.Data;

namespace API.Controllers;

/// <summary>
/// Controller til håndtering af brugerregistrering og login.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly JwtService _jwtService;
    
    /// <summary>
    /// Initialiserer AuthController med databasekontekst og JWT-service.
    /// </summary>
    /// <param name="context">Databasekontekst</param>
    /// <param name="jwtService">JWT-service til token generering</param>
    public AuthController(AppDBContext context, JwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Registrerer en ny bruger.
    /// </summary>
    /// <param name="registerDto">Data for brugerregistrering</param>
    /// <returns>
    /// <para><b>200 OK:</b> Bruger registreret succesfuldt. Returnerer brugerinfo.</para>
    /// <para><b>400 Bad Request:</b> Ugyldig model, email eller brugernavn er allerede i brug.</para>
    /// </returns>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterUserDto registerDto)
    {
        // Validate model
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Tjekker om email allerede eksisterer
        var normalizedRegisterEmail = registerDto.Email.ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedRegisterEmail))
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
        var user = new API.Model.User
        {
            Name = registerDto.Name,
            Email = normalizedRegisterEmail, // Gem e-mail som små bogstaver
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

        // Returner succesbesked og brugerinfo
        return Ok(new
        {
            message = "Bruger registreret succesfuldt.",
            user = new
            {
                id = user.Id,
                name = user.Name,
                email = user.Email,
                role = user.Role.Name
            }
        });
    }

    /// <summary>
    /// Logger en bruger ind.
    /// </summary>
    /// <param name="loginDto">Login data</param>
    /// <returns>
    /// <para><b>200 OK:</b> Login succesfuldt. Returnerer JWT token og brugerinfo.</para>
    /// <para><b>400 Bad Request:</b> Ugyldig model.</para>
    /// <para><b>401 Unauthorized:</b> Ugyldig email eller adgangskode.</para>
    /// </returns>
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginUserDto loginDto)
    {
        // Validate model
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Find bruger med email (case-insensitive)
        var normalizedLoginEmail = loginDto.Email.ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedLoginEmail);

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
