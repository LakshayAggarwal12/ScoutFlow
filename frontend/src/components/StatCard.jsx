import { formatNumber } from "../lib/format.js";

const TONES = {
  accent: "bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-300",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

// KPI tile: icon chip, label, large tabular figure and an optional context line.
export default function StatCard({ icon: Icon, label, value, hint, tone = "accent", loading = false, className = "" }) {
  return (
    <div className={`card card-hover p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <div className="skeleton mt-2 h-7 w-16" />
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-ink dark:text-white">
              {typeof value === "number" ? formatNumber(value) : (value ?? "—")}
            </p>
          )}
          {hint && !loading && <p className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONES[tone] || TONES.accent}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
    </div>
  );
}
