using API.Service;

namespace UnitTest;

public class PasswordHashTest
{
    [SetUp]
    public void Setup()
    {
    }

    [Test]
    public void PasswordHash_HashesWithBcrypt()
    {
        // Arrange
        var password = "MyPassword123";

        // Act
        var hash = PasswordHelper.CreatePasswordHashString(password);

        // Assert - BCrypt hashes starter altid med $2, og hash er ikke det samme som password
        Assert.That(hash, Does.StartWith("$2"));
        Assert.That(hash, Is.Not.EqualTo(password));
    }
}
