import { IconAlert, IconRefresh } from "./icons.jsx";

export default function ErrorState({ message, onRetry, title = "Something went wrong" }) {
  return (
    <div
      role="alert"
      className="card flex flex-col gap-4 border-red-200 bg-red-50/60 p-5 animate-fade-in sm:flex-row sm:items-start dark:border-red-900/60 dark:bg-red-950/20"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
        <IconAlert size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">{title}</p>
        {message && <p className="mt-1 break-words text-sm text-red-600/90 dark:text-red-400/90">{message}</p>}
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm shrink-0">
          <IconRefresh size={15} />
          Try again
        </button>
      )}
    </div>
  );
}

