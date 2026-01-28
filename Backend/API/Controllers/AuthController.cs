using API.Data;
using API.Model;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("[controller]")]

public class AuthController : ControllerBase 
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }
    [HttpPost("register")]
    public ActionResult<User> Register(RegisterDto request) {
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
        return Ok(user);
    }

    [HttpPost("login")]
    public ActionResult<User> Login(LoginDto request)
    {
    }

}



