using API.Controllers;
using API.Data;
using API.Model;
using API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Test;

public class DeleteDeliveryRouteTest
{
    [SetUp]
    public void Setup()
    {
    }

    [TearDown]
    public void TearDown()
    {
    }

    [Test]
    public async Task DeleteDeliveryRoute()
    {
        // Arrange - set up an in-memory database with a route
        var options = new DbContextOptionsBuilder<AppDBContext>()
            .UseInMemoryDatabase(databaseName: "DeleteRouteTestDb")
            .Options;

        var context = new AppDBContext(options);

        // Mock the services (Delete doesn't use them, but the controller requires them)
        var mockGeo = new Mock<IGeolocationService>();
        var mockRouting = new Mock<IRoutingService>();

        // Add required seed data
        context.Roles.Add(new Role { Id = 1, Name = "Employee" });
        context.RouteStatuses.Add(new RouteStatus { Id = 1, Name = "Pending" });
        context.Users.Add(new User
        {
            Id = 1,
            Name = "TestUser",
            Email = "test@test.com",
            Password = "hashedpassword",
            RoleId = 1
        });
        context.DeliveryRoutes.Add(new DeliveryRoute
        {
            Id = 1,
            Name = "Test Route",
            ScheduledDate = new DateOnly(2026, 1, 1),
            UserId = 1,
            RouteStatusId = 1
        });
        await context.SaveChangesAsync();

        // Create the controller with mocked services
        var controller = new DeliveryRouteController(
            context,
            mockGeo.Object,
            mockRouting.Object
        );

        // Act - delete the route
        var result = await controller.DeleteDeliveryRoute(1);

        // Assert - check that we get NoContent (204) and the route is gone
        Assert.That(result, Is.InstanceOf<NoContentResult>());

        var deletedRoute = await context.DeliveryRoutes.FindAsync(1);
        Assert.That(deletedRoute, Is.Null);
    }
}
