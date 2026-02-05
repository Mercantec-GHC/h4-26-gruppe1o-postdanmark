using System.ComponentModel.DataAnnotations;

namespace API.Model;

public class Common
{
    [Key]
    public int Id { get; set; } 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}