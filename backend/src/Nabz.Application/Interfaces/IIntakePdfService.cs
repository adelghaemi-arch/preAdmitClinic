/*
 File: backend/src/Nabz.Application/Interfaces/IIntakePdfService.cs
 Description: UC-ADM-26 — تولید PDF پرسشنامه submitted از قیف
 Parent Dependencies: none
 */

namespace Nabz.Application.Interfaces;

public record IntakePdfFileResult(byte[] Content, string FileName, string ContentType);

public interface IIntakePdfService
{
    /// <summary>PDF واقعی A4 از Chromium؛ همان گاردهای submitted-form.</summary>
    Task<IntakePdfFileResult> GenerateMemberIntakePdfAsync(
        Guid contractId, Guid memberId, CancellationToken ct = default);
}
