/*
 File: frontend/my/src/components/ListPager.tsx
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

  const navBtn =
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-35";

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 px-3.5 py-2.5 sm:px-5 ${className}`}
    >
      <span className="text-[10px] leading-7 text-slate-400">
        نمایش {toFaDigits(from)}–{toFaDigits(to)} از {toFaDigits(totalCount)} {itemLabel}
      </span>
      <div className="flex h-7 items-center gap-1">
        <button
          type="button"
          aria-label="صفحه قبل"
          disabled={disabled || safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className={navBtn}
        >
          <ChevronRight className="h-2.5 w-2.5" strokeWidth={2.25} />
        </button>
        <span className="inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded border border-teal-100 bg-teal-50 px-2 text-[10px] font-semibold leading-none tabular-nums text-teal-700">
          {toFaDigits(safePage)}/{toFaDigits(totalPages)}
        </span>
        <button
          type="button"
          aria-label="صفحه بعد"
          disabled={disabled || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className={navBtn}
        >
          <ChevronLeft className="h-2.5 w-2.5" strokeWidth={2.25} />
        </button>
      </div>
      <label className="ms-auto flex items-center gap-1.5 text-[10px] text-slate-500">
        <span>در هر صفحه</span>
        <select
          aria-label="تعداد در هر صفحه"
          disabled={disabled}
          value={size}
          onChange={(e) => {
            onPageSizeChange(clampListPageSize(Number(e.target.value)));
            onPageChange(1);
          }}
          className="app-select !h-7 !min-h-7 !py-0 !pl-2 !pr-6 text-[10px] leading-7"
        >
          {LIST_PAGE_SIZES.map((n) => (
            <option key={n} value={n}>
              {toFaDigits(n)}
            </option>
          ))}
        </select>
      </label>
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
