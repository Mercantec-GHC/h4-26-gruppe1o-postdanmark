using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.Model;
using Microsoft.IdentityModel.Tokens;

namespace API.Services;

public class JwtService
{
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expiryMinutes;

    public JwtService(IConfiguration configuration)
    {
        //Load konfiguration fra appsettings eller environment variables
        _secretKey = configuration["Jwt:SecretKey"]
                     ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY");
            

        _issuer = configuration["Jwt:Issuer"]
            ?? Environment.GetEnvironmentVariable("JWT_ISSUER")
            ?? "postdanmark-api";

        _audience = configuration["Jwt:Audience"]
            ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE")
            ?? "postdanmark-client";

        _expiryMinutes = int.Parse(configuration["Jwt:ExpiryMinutes"]
            ?? Environment.GetEnvironmentVariable("JWT_EXPIRY_MINUTES")
            ?? "60");
    }

    public string GenerateToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler(); 
        var key = Encoding.ASCII.GetBytes(_secretKey); //Konverter hemmelig nøgle til byte array

        //Definer claims for tokenet
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim("userId", user.Id.ToString()),
            new Claim("username", user.Name),
            new Claim("email", user.Email)
        };
        // Tilføj rolleclaim hvis brugeren har en rolle
        if (user.Role != null)
        {
            claims.Add(new Claim(ClaimTypes.Role, user.Role.Name));
        }
        
        //Opret tokenbeskrivelsen

        var tokenDescriptor = new SecurityTokenDescriptor 
        {
            Subject = new ClaimsIdentity(claims), 
            Expires = DateTime.UtcNow.AddMinutes(_expiryMinutes), 
            Issuer = _issuer, 
            Audience = _audience, 
            SigningCredentials = new SigningCredentials( 
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor); //Opret tokenet
        return tokenHandler.WriteToken(token); //Returnér tokenet som en streng
    }
}
