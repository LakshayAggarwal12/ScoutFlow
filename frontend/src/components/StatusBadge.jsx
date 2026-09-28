import { statusLabel } from "../lib/status.js";

const NEUTRAL = {
  chip: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  dot: "bg-slate-400 dark:bg-slate-500",
};

const STYLES = {
  DRAFT: NEUTRAL,
  QUEUED: {
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    dot: "bg-amber-500",
  },
  PLANNING: {
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    dot: "bg-amber-500 animate-pulse",
  },
  RETRY_SCHEDULED: {
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    dot: "bg-amber-500",
  },
  PARTIAL: {
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
    dot: "bg-amber-500",
  },
  PENDING: NEUTRAL,
  RUNNING: {
    chip: "bg-accent/10 text-accent-700 ring-accent/20 dark:bg-accent/15 dark:text-accent-300 dark:ring-accent/30",
    dot: "bg-accent animate-pulse",
  },
  PLANNED: {
    chip: "bg-accent/10 text-accent-700 ring-accent/20 dark:bg-accent/15 dark:text-accent-300 dark:ring-accent/30",
    dot: "bg-accent",
  },
  COMPLETED: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    dot: "bg-emerald-500",
  },
  COLLECTED: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    dot: "bg-emerald-500",
  },
  VALID: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
    dot: "bg-emerald-500",
  },
  FAILED: {
    chip: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
    dot: "bg-red-500",
  },
  INVALID: {
    chip: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60",
    dot: "bg-red-500",
  },
  CANCELLED: NEUTRAL,
};

export default function StatusBadge({ status, showDot = true, className = "" }) {
  const style = STYLES[status] || NEUTRAL;
  return (
    <span className={`badge ring-1 ring-inset ${style.chip} ${className}`} title={status}>
      {showDot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />}
      {statusLabel(status)}
    </span>
  );
}

