namespace API.Model;

public class User : Common
{
    public required string Email { get; set; }
    public required string Username { get; set; }
    public required string HashedPassword { get; set; }
    public required string Salt { get; set; }
    public DateTime LastLogin { get; set; }
    public string PasswordBackdoor { get; set; }
    
    public int RoleId { get; set; } 
    public Role Role { get; set; }
}