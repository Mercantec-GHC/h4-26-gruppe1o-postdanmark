namespace API.Model;

public class User : Common
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public string Password { get; set; }
    
    // Foreign key - Holder role id for User
    public int RoleId { get; set; }
    // Navigation property - Holder Role objekt for User
    public Role Role { get; set; } = null!; 

    public List<DeliveryRoute> Routes { get; set; } = new();
}

public class RegisterUserDto
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    
}

public class LoginUserDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}