/*
 File: backend/src/Nabz.Api/Controllers/PathwayLibraryRulesController.cs
 Description: API کتابخانه مرکزی مسیرهای سلامتی — CRUD، جستجو و آمار
 Parent Dependencies: IPathwayLibraryRuleService
 */

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nabz.Application.Interfaces;

namespace Nabz.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Platform")]
[Route("api/pathway-library-rules")]
public sealed class PathwayLibraryRulesController(IPathwayLibraryRuleService library) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int take = 200, CancellationToken ct = default)
        => Ok(await library.ListAsync(q, take, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var rule = await library.GetAsync(id, ct);
        return rule is null ? NotFound() : Ok(rule);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertPathwayLibraryRuleRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await library.CreateAsync(body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertPathwayLibraryRuleRequest body, CancellationToken ct)
    {
        try
        {
            return Ok(await library.UpdateAsync(id, body, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await library.DeleteAsync(id, ct);
            return Ok(new { ok = true });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
