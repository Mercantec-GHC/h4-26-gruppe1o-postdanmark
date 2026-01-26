using System.ComponentModel.DataAnnotations;

namespace API.Model;

public class Common
{
    [Key]
    public int Id { get; set; } 
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}