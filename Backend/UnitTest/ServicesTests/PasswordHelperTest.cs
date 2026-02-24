using API.Services;

namespace UnitTest.ServicesTests;

public class PasswordHashTest
{
    [Test]
    public void PasswordHash_HashesWithBcrypt()
    {
        // Arrange
        var password = "MyPassword123";

        // Act
        var hash = PasswordHelper.CreatePasswordHashString(password);

        // Assert 
        Assert.That(hash, Does.StartWith("$2"));
        Assert.That(hash, Is.Not.EqualTo(password));
    }
}
