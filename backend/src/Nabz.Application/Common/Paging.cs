/*
 File: backend/src/Nabz.Application/Common/Paging.cs
 Description: قرارداد مشترک صفحه‌بندی لیست‌ها — سایزهای مجاز ۱۰/۲۰/۵۰/۱۰۰
 Parent Dependencies: none
 */

namespace Nabz.Application.Common;

public static class Paging
{
    public static readonly int[] AllowedPageSizes = [10, 20, 50, 100];
    public const int DefaultPageSize = 20;

    public static int ClampPage(int page) => page < 1 ? 1 : page;

    public static int ClampPageSize(int pageSize)
        => AllowedPageSizes.Contains(pageSize) ? pageSize : DefaultPageSize;
}

/// <summary>نتیجهٔ صفحه‌بندی استاندارد API (page یک‌پایه).</summary>
public record PagedResultDto<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);
