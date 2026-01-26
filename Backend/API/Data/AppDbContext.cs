using API.Model;
using Microsoft.EntityFrameworkCore;

namespace API.Data;

public class AppDBContext : DbContext
{
    public AppDBContext(DbContextOptions<AppDBContext> options)
        : base(options)
    {
        
    }
    public DbSet<User> Users { get; set; }
}