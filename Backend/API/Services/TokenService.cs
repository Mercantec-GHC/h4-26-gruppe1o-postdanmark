using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using API.Model;
using Microsoft.IdentityModel.Tokens;

namespace API.Services;

public class TokenService
{
    private readonly IConfiguration _config;

    // Constructor: We ask for the Configuration so we can open the "Safe" (appsettings.json)
    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public string CreateToken(User user)
    {
        // 1. Get the secret key from the safe
        var tokenKey = _config["Jwt:Key"];
        
        // 2. Prepare the "Wax Stamp" (Security Key)
        // We turn the text key into byte numbers so the math works
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(tokenKey));

        // 3. Prepare the "Ink" (Credentials)
        // We choose the HmacSha256 algorithm to sign the token
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // 4. Write the Claims (What is written ON the wristband)
        // We only write the Username for now. This is the info stored inside the token.
        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.NameId, user.Username)
        };

        // 5. Describe the Token
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(7), // The wristband is valid for 7 days
            SigningCredentials = creds // Stamp it with our secret wax seal
        };

        // 6. Build and Write the Token
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        // 7. Hand it back as a string
        return tokenHandler.WriteToken(token);
    }
}