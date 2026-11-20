/*
 File: frontend/src/components/ListPager.tsx
 Description: پیجر استاندارد لیست — سایز ۱۰/۲۰/۵۰/۱۰۰، RTL، موبایل+وب
 Parent Dependencies: lib/persian toFaDigits
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { toFaDigits } from "@/lib/persian";

export const LIST_PAGE_SIZES = [10, 20, 50, 100] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZES)[number];

export interface ListPagerProps {
  /** صفحهٔ یک‌پایه */
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: ListPageSize) => void;
  /** برچسب موجودیت؛ پیش‌فرض «مورد» */
  itemLabel?: string;
  className?: string;
  disabled?: boolean;
}

export function clampListPageSize(size: number): ListPageSize {
  return (LIST_PAGE_SIZES as readonly number[]).includes(size) ? (size as ListPageSize) : 20;
}

export function ListPager({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  itemLabel = "مورد",
  className = "",
  disabled = false,
}: ListPagerProps) {
  const size = clampListPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalCount) / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * size + 1;
  const to = Math.min(safePage * size, totalCount);

  return (
    <div
      className={`flex flex-col gap-2 border-t border-slate-100 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
        <span>
          نمایش {toFaDigits(from)}–{toFaDigits(to)} از {toFaDigits(totalCount)} {itemLabel}
        </span>
        <label className="flex items-center gap-1.5 text-slate-500">
          <span>در هر صفحه</span>
          <select
            aria-label="تعداد در هر صفحه"
            disabled={disabled}
            value={size}
            onChange={(e) => {
              onPageSizeChange(clampListPageSize(Number(e.target.value)));
              onPageChange(1);
            }}
            className="app-select py-1 text-[10px]"
          >
            {LIST_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {toFaDigits(n)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <button
          type="button"
          aria-label="صفحه قبل"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="rounded-md border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 disabled:opacity-35"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-teal-50 px-1.5 text-[10px] font-semibold text-teal-700">
          {toFaDigits(safePage)} / {toFaDigits(totalPages)}
        </span>
        <button
          type="button"
          aria-label="صفحه بعد"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-md border border-slate-200 p-1 text-slate-400 hover:bg-slate-50 disabled:opacity-35"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** برش کلاینت‌ساید برای لیست‌های از قبل لود‌شده */
export function slicePage<T>(items: T[], page: number, pageSize: number): T[] {
  const size = clampListPageSize(pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return items.slice(start, start + size);
}
