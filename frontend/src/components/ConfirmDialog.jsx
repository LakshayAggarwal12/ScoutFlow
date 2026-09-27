export default function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", danger, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-30 animate-fade-in" onClick={onCancel}>
      <div
        className="card p-6 w-full max-w-sm mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary px-3 py-1.5" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={danger ? "btn-danger px-3 py-1.5" : "btn-primary px-3 py-1.5"} onClick={onConfirm} disabled={loading}>
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
