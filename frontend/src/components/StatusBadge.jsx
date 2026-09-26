const STYLES = {
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  PLANNING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  QUEUED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  RUNNING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  RETRY_SCHEDULED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  VALID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  INVALID: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  COLLECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  PENDING: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${STYLES[status] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{status}</span>;
}
