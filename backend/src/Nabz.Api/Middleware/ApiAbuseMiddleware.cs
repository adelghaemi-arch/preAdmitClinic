/*
 File: backend/src/Nabz.Api/Middleware/ApiAbuseMiddleware.cs
 Description: Early و PostAuth گارد سوءاستفاده API (UC-PLT-17)
 Parent Dependencies: IApiAbuseGuardService, TokenHashing
 */

using System.Security.Claims;
using Nabz.Application.Interfaces;
using Nabz.Application.Security;

namespace Nabz.Api.Middleware;

public sealed class ApiAbuseEarlyMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IApiAbuseGuardService guard)
    {
        var path = context.Request.Path.Value ?? "/";
        var method = context.Request.Method;
        var tokenHash = TryBearerHash(context);
        var ip = context.Connection.RemoteIpAddress?.ToString();

        var result = guard.EvaluateEarly(tokenHash, ip, method, path);
        if (result.Verdict is ApiAbuseVerdict.Allow)
        {
            await next(context);
            return;
        }

        await WriteBlockedAsync(context, result);
    }

    internal static string? TryBearerHash(HttpContext context)
    {
        if (!context.Request.Headers.TryGetValue("Authorization", out var header))
            return null;
        var value = header.ToString();
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return null;
        var token = value["Bearer ".Length..].Trim();
        return string.IsNullOrEmpty(token) ? null : TokenHashing.Sha256Hex(token);
    }

    internal static async Task WriteBlockedAsync(HttpContext context, ApiAbuseEvaluateResult result)
    {
        var status = result.Verdict == ApiAbuseVerdict.Denied ? StatusCodes.Status401Unauthorized : StatusCodes.Status429TooManyRequests;
        context.Response.StatusCode = status;
        if (result.RetryAfterSeconds > 0)
            context.Response.Headers.RetryAfter = result.RetryAfterSeconds.ToString();
        await context.Response.WriteAsJsonAsync(new
        {
            ok = false,
            error = result.Message ?? "درخواست رد شد.",
            code = result.Verdict.ToString()
        });
    }
}

public sealed class ApiAbusePostAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IApiAbuseGuardService guard)
    {
        var path = context.Request.Path.Value ?? "/";
        var method = context.Request.Method;
        var user = context.User;
        Guid? userId = null;
        if (Guid.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
            userId = uid;

        var roles = user.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        var tokenHash = ApiAbuseEarlyMiddleware.TryBearerHash(context);
        var ip = context.Connection.RemoteIpAddress?.ToString();

        var result = await guard.EvaluatePostAuthAsync(userId, tokenHash, roles, method, path, ip, context.RequestAborted);
        if (result.Verdict is ApiAbuseVerdict.Allow)
        {
            await next(context);
            return;
        }

        await ApiAbuseEarlyMiddleware.WriteBlockedAsync(context, result);
    }
}
