using API.Model;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class AppDBContext : DbContext
{
    public AppDBContext(DbContextOptions<AppDBContext> options)
        : base(options)
    {
        
    }
    
    // Roller og Statusser
    public DbSet<Role> Roles { get; set; }
    public DbSet<RouteStatus> RouteStatuses { get; set; }
    public DbSet<StopStatus> StopStatuses { get; set; }
    
    // Hovedtabeller
    public DbSet<User> Users { get; set; }
    public DbSet<DeliveryRoute> DeliveryRoutes { get; set; }
    public DbSet<Stop> Stops { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var seedDate = DateTime.SpecifyKind(new DateTime(2025, 11, 10, 10, 21, 28), DateTimeKind.Utc);

        // Seed Roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Employee", CreatedAt = seedDate, UpdatedAt = seedDate },
            new Role { Id = 2, Name = "Admin", CreatedAt = seedDate, UpdatedAt = seedDate }
        );

        // Seed Route Statuses
        modelBuilder.Entity<RouteStatus>().HasData(
            new RouteStatus { Id = 1, Name = "Pending", CreatedAt = seedDate, UpdatedAt = seedDate },
            new RouteStatus { Id = 2, Name = "Assigned", CreatedAt = seedDate, UpdatedAt = seedDate },
            new RouteStatus { Id = 3, Name = "Active", CreatedAt = seedDate, UpdatedAt = seedDate },
            new RouteStatus { Id = 4, Name = "Completed", CreatedAt = seedDate, UpdatedAt = seedDate },
            new RouteStatus { Id = 5, Name = "Cancelled", CreatedAt = seedDate, UpdatedAt = seedDate }
        );

        // Seed Stop Statuses
        modelBuilder.Entity<StopStatus>().HasData(
            new StopStatus { Id = 1, Name = "Scheduled", CreatedAt = seedDate, UpdatedAt = seedDate },
            new StopStatus { Id = 2, Name = "Delivered", CreatedAt = seedDate, UpdatedAt = seedDate },
            new StopStatus { Id = 3, Name = "Failed", CreatedAt = seedDate, UpdatedAt = seedDate }
        );
    }
}