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

        // Relationer mellem tabeller

        // User <-> Role (many-to-one)
        modelBuilder.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // DeliveryRoute <-> User (many-to-one)
        modelBuilder.Entity<DeliveryRoute>()
            .HasOne(dr => dr.User)
            .WithMany(u => u.DeliveryRoutes)
            .HasForeignKey(dr => dr.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // DeliveryRoute <-> RouteStatus (many-to-one)
        modelBuilder.Entity<DeliveryRoute>()
            .HasOne(dr => dr.Status)
            .WithMany(rs => rs.Routes)
            .HasForeignKey(dr => dr.RouteStatusId)
            .OnDelete(DeleteBehavior.Restrict);

        // Stop <-> DeliveryRoute (many-to-one)
        modelBuilder.Entity<Stop>()
            .HasOne(s => s.Route)
            .WithMany(dr => dr.Stops)
            .HasForeignKey(s => s.RouteId)
            .OnDelete(DeleteBehavior.Cascade);

        // Stop <-> StopStatus (many-to-one)
        modelBuilder.Entity<Stop>()
            .HasOne(s => s.Status)
            .WithMany(ss => ss.Stops)
            .HasForeignKey(s => s.StopStatusId)
            .OnDelete(DeleteBehavior.Restrict);

        var seedDate = DateTime.SpecifyKind(new DateTime(2026, 01, 27, 13, 12, 0), DateTimeKind.Utc);

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