namespace API.Model;

public class User : Common
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public DateTime LastLogin { get; set; }
}