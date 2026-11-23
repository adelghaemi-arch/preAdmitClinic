/*
 File: backend/src/Nabz.Api/Controllers/PathwaysController.cs
 Description: API مسیرهای سلامتی واحد — CRUD، جستجو، کتابخانه و آمار
 Parent Dependencies: IPathwayService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/pathways")]
public sealed class PathwaysController(IPathwayService pathways) : ControllerBase
{
    // خواندن برای Reception/Owner و … تا workspace به MOCK برنگردد؛ mutate فقط ادمین
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? q,
        [FromQuery] bool libraryOnly = false,
        [FromQuery] int take = 200,
        CancellationToken ct = default)
        => Ok(await pathways.ListAsync(q, libraryOnly, take, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var item = await pathways.GetAsync(id, ct);
        return item is null ? NotFound() : Ok(item);
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertPathwayRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await pathways.CreateAsync(body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertPathwayRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await pathways.UpdateAsync(id, body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Platform")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await pathways.DeleteAsync(id, ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
