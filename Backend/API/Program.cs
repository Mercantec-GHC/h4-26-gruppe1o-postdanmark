using API.Data;
using API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// DbContext
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                          ?? Environment.GetEnvironmentVariable("DefaultConnection")
                          ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AppDBContext>(options =>
    options.UseNpgsql(connectionString));

builder.AddServiceDefaults();


// Add services to the container.

builder.Services.AddControllers();

// Register JwtService
builder.Services.AddScoped<JwtService>();

// Configure JWT Authentication
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
    ?? "MyVerySecureSecretKeyThatIsAtLeast32CharactersLong123456789";

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? Environment.GetEnvironmentVariable("JWT_ISSUER")
    ?? "postdanmark-api";

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE")
    ?? "postdanmark-client";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecretKey))
    };
});

// Add CORS support for Flutter app
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFlutterApp", policy =>
    {
        policy.WithOrigins(
                "https://h4-flutter.mercantec.tech",
                "https://h4-api.mercantec.tech"
            )
            .AllowAnyMethod()               // Allow GET, POST, PUT, DELETE, etc.
            .AllowAnyHeader()               // Allow any headers
            .AllowCredentials();            // Allow cookies/auth headers
    });

    // Development policy - more permissive for local development
    options.AddPolicy("AllowAllLocalhost", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                // Tillad alle localhost og 127.0.0.1 origins med alle porte
                var uri = new Uri(origin);
                return uri.Host == "localhost" ||
                       uri.Host == "127.0.0.1" ||
                       uri.Host == "0.0.0.0";
            })
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();


// OpenAPI configuration will be handled by middleware

var app = builder.Build();

app.MapDefaultEndpoints();

// Configure the HTTP request pipeline.

app.UseForwardedHeaders();

app.MapOpenApi();

// Enable Swagger UI (klassisk dokumentation (Med Darkmode))
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "API v1");
    options.RoutePrefix = "swagger"; // Tilgængelig på /swagger
    options.AddSwaggerBootstrap(); // UI Pakke lavet af NHave - https://github.com/nhave
});

app.UseStaticFiles(); // Vigtig for SwaggerBootstrap pakken


// Enable Scalar UI (moderne alternativ til Swagger UI)
app.MapScalarApiReference(options =>
    {
        options.WithTitle("API Documentation")
               .WithTheme(ScalarTheme.Purple)
               .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient);
    });


// Enable CORS - SKAL være før UseAuthorization
app.UseCors(app.Environment.IsDevelopment() ? "AllowAllLocalhost" : "AllowFlutterApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Log API dokumentations URL'er ved opstart
app.Lifetime.ApplicationStarted.Register(() =>
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    var addresses = app.Services.GetRequiredService<Microsoft.AspNetCore.Hosting.Server.IServer>()
        .Features.Get<Microsoft.AspNetCore.Hosting.Server.Features.IServerAddressesFeature>()?.Addresses;

    if (addresses != null && app.Environment.IsDevelopment())
    {
        foreach (var address in addresses)
        {
            logger.LogInformation("Swagger UI: {Address}/swagger", address);
            logger.LogInformation("Scalar UI:  {Address}/scalar", address);
        }
    }
});

app.Run();
