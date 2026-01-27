using BCrypt.Net;
namespace API.Service;

public class PasswordHelper
{
    public static string CreatePasswordHashString(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        if (string.IsNullOrEmpty(storedHash)) return false;
        return BCrypt.Net.BCrypt.Verify(password, storedHash);
    }
}