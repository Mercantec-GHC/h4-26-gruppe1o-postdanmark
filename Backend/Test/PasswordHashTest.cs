using API.Service;

namespace Test;

public class PasswordHashTest
{
    [Test]
    public void PasswordHash_HashesWithBcrypt()
    {
        // Arrange
        var password = "MyPassword123";

        // Act
        var hash = PasswordHelper.CreatePasswordHashString(password);

        // Assert - BCrypt hashes always start with "$2"
        Assert.That(hash, Does.StartWith("$2"));
        Assert.That(hash, Is.Not.EqualTo(password));
    }
}
