import { useEffect, useRef } from "react";
import { IconAlert, IconInfo } from "./icons.jsx";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
  loading,
}) {
  const confirmRef = useRef(null);

  // Escape closes the dialog and the primary action receives focus on open.
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
      role="presentation"
      onMouseDown={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card w-full max-w-md p-5 shadow-pop animate-scale-in sm:p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              danger
                ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
                : "bg-accent/10 text-accent dark:bg-accent/15 dark:text-accent-300"
            }`}
          >
            {danger ? <IconAlert size={19} /> : <IconInfo size={19} />}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink dark:text-white">{title}</h2>
            {description && (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary btn-sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`${danger ? "btn-danger" : "btn-primary"} btn-sm`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="spinner" />}
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

