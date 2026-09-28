import { IconChevronLeft, IconChevronRight } from "./icons.jsx";
import { formatNumber } from "../lib/format.js";

// Shared pagination footer - same Prev/Next contract as before, but one
// implementation instead of a copy per page.
export default function Pagination({
  page,
  totalPages,
  total,
  unit = "item",
  onChange,
  loading = false,
  className = "",
}) {
  const pages = Math.max(1, totalPages || 1);
  const countLabel =
    typeof total === "number" ? `${formatNumber(total)} ${unit}${total === 1 ? "" : "s"}` : null;

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400 ${className}`}
    >
      <p className="tabular-nums">
        {countLabel}
        {countLabel && <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>}
        Page <span className="font-medium text-slate-700 dark:text-slate-200">{page}</span> of {pages}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <IconChevronLeft size={15} />
          Prev
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          disabled={loading || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <IconChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
