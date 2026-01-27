namespace API.Model;

public class RegisterDto
{
    public required string Email { get; set; }
    public required string Username { get; set; }
    public required string Password { get; set; } // raw password (e.g. "1234")
}