using System.ComponentModel.DataAnnotations;
namespace API.Model;

public class User : Common
{
    [Required(ErrorMessage = "Brugernavn er påkrævet.")]
    [MinLength(3, ErrorMessage = "Brugernavn skal være mindst 3 tegn.")]
    [MaxLength(32, ErrorMessage = "Brugernavn må højst være 32 tegn.")]
    [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = 
        "Kun bogstaver, tal, _, . og - er tilladt.")]
    public required string Name { get; set; }
    
    [Required(ErrorMessage = "Email er påkrævet.")]
    [EmailAddress(ErrorMessage = "Ugyldig email-adresse.")]
    [Display(Name = "Email")]
    public required string Email { get; set; }
    
    [Required(ErrorMessage = "Adgangskode er påkrævet.")]
    [StringLength(100, MinimumLength = 8, 
        ErrorMessage = "Adgangskoden skal være mindst 8 tegn.")]
    [Display(Name = "Adgangskode")]
    public required string Password { get; set; }
    
    public DateTime LastLogin { get; set; }
    
    // Foreign key - Holder role id for User
    public int RoleId { get; set; }
    // Navigation property - Holder Role objekt for User
    public Role Role { get; set; } = null!; 

    public List<DeliveryRoute> Routes { get; set; } = new();
}

public class RegisterUserDto
{
    [Required(ErrorMessage = "Brugernavn er påkrævet.")]
    [MinLength(3, ErrorMessage = "Brugernavn skal være mindst 3 tegn.")]
    [MaxLength(32, ErrorMessage = "Brugernavn må højst være 32 tegn.")]
    [RegularExpression(@"^[a-zA-Z0-9_.-]+$", ErrorMessage = 
        "Kun bogstaver, tal, _, . og - er tilladt.")]
    public required string Name { get; set; }
    
    [Required(ErrorMessage = "Email er påkrævet.")]
    [EmailAddress(ErrorMessage = "Ugyldig email-adresse.")]
    public required string Email { get; set; }
    
    [Required(ErrorMessage = "Adgangskode er påkrævet.")]
    [StringLength(100, MinimumLength = 8, 
        ErrorMessage = "Adgangskoden skal være mindst 8 tegn.")]
    public required string Password { get; set; }
}

public class LoginUserDto
{
    [Required(ErrorMessage = "Email er påkrævet.")]
    [EmailAddress(ErrorMessage = "Ugyldig email-adresse.")]
    public required string Email { get; set; }
    
    [Required(ErrorMessage = "Adgangskode er påkrævet.")]
    public required string Password { get; set; }
}