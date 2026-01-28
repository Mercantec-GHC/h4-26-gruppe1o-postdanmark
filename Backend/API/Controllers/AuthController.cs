using API.Data;
using API.Model;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]

// Creates a controller that handles user authentication requests from the web
public class AuthController : ControllerBase 
{
    // Stores a reference to the database so we can access user data
    private readonly AppDbContext _context;
    private readonly API.Services.TokenService _tokenService;

    // Constructor - runs when AuthController is created
    // It receives the database (context) as a parameter
    public AuthController(AppDbContext context, API.Services.TokenService tokenService)
    {
        // Saves the database reference so we can use it in other methods
        _context = context;
        _tokenService = tokenService;
    }

    [HttpPost("register")]
    public ActionResult<UserResponseDto> Register(RegisterDto request) {
        using var hmac = new System.Security.Cryptography.HMACSHA512();
        
        var user = new User
        {
            Email = request.Email,
            Username = request.Username,
            PasswordBackdoor = "nothing",
            Salt = Convert.ToBase64String(hmac.Key),
            HashedPassword = Convert.ToBase64String(hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(request.Password)))
        };
        
        _context.Users.Add(user);
        _context.SaveChanges();
        
        var response = new UserResponseDto
        {
            Email = user.Email,
            Username = user.Username,
            Token = _tokenService.CreateToken(user)
        };
        return Ok(response);
    }

    //This method handles when someone tries to log in to your application:
    [HttpPost("login")]
    public ActionResult<UserResponseDto> Login(LoginDto request) 
    {
        var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);

        if (user == null)
        {
            return BadRequest("User not found");
        }
        
        // 1. Convert the random spice (Salt) from text back to numbers
        var salt = Convert.FromBase64String(user.Salt);
        // 2. Turn on the Blender, but THIS TIME we pour in the specific Salt we found
        using var hmac = new System.Security.Cryptography.HMACSHA512(salt);
        // 3. Blend the input password
        var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(request.Password));
        // 4. Convert the new blend to text so we can compare it
        var computedHashString = Convert.ToBase64String(computedHash);
        // 5. Compare: Does the new blend match the old blend?
        if (computedHashString != user.HashedPassword)
        {
            return BadRequest("Wrong password");
        }

        var response = new UserResponseDto
        {
            Email = user.Email,
            Username = user.Username,
            Token = _tokenService.CreateToken(user)
        };

        return Ok(response);
    }
}



