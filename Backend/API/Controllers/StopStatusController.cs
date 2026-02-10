using API.Data;
using API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StopStatusController : ControllerBase
{
    private readonly AppDBContext _context;

    public StopStatusController(AppDBContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Hent alle tilgængelige stop-statusser
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<StopStatusDto>>> GetAllStopStatuses()
    {
        var statuses = await _context.StopStatuses.ToListAsync();

        var dtos = statuses.Select(s => new StopStatusDto
        {
            Name = s.Name
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Hent den aktuelle status for et specifikt stop
    /// </summary>
    [HttpGet("stop/{stopId}")]
    public async Task<ActionResult<StopDto>> GetStopStatus(int stopId)
    {
        var stop = await _context.Stops
            .Include(s => s.Status)
            .FirstOrDefaultAsync(s => s.Id == stopId);

        if (stop == null)
        {
            return NotFound($"Stop med ID {stopId} blev ikke fundet");
        }

        var dto = new StopDto
        {
            Address = stop.Address,
            Latitude = stop.Latitude,
            Longitude = stop.Longitude,
            Sequence = stop.SequenceOrder,
            Status = stop.Status != null ? new StopStatusDto { Name = stop.Status.Name } : null
        };

        return Ok(dto);
    }

    /// <summary>
    /// Opdater status for et specifikt stop. Sæt StopId til de seeded værdier i databasen: 1 = Scheduled, 2 = Delivered, 3 = Failed
    /// </summary>
    [HttpPut("stop/{stopId}")]
    public async Task<ActionResult<StopDto>> UpdateStopStatus(int stopId, [FromBody] UpdateStopStatusDto dto)
    {
        var stop = await _context.Stops
            .Include(s => s.Status)
            .FirstOrDefaultAsync(s => s.Id == stopId);

        if (stop == null)
        {
            return NotFound($"Stop med ID {stopId} blev ikke fundet");
        }

        var newStatus = await _context.StopStatuses.FindAsync(dto.StopStatusId);
        if (newStatus == null)
        {
            return BadRequest($"StopStatus med ID {dto.StopStatusId} blev ikke fundet");
        }

        stop.StopStatusId = dto.StopStatusId;
        stop.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var resultDto = new StopDto
        {
            Address = stop.Address,
            Latitude = stop.Latitude,
            Longitude = stop.Longitude,
            Sequence = stop.SequenceOrder,
            Status = new StopStatusDto { Name = newStatus.Name }
        };

        return Ok(resultDto);
    }
}