namespace API.Model;

public class UserResponseDto
{
    public required string Email { get; set; }
    public required string Username { get; set; }
    public string Token { get; set; }
}

