namespace API.Model;
// Rolle for brugere: Admin eller employee
public class Role : Common
{
    public required string Name { get; set; }
    public List<User> Users { get; set; } = new();
}
