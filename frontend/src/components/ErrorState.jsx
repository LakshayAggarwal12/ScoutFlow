export default function ErrorState({ message, onRetry }) {
  return (
    <div className="card p-6 border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 animate-fade-in">
      <p className="text-sm font-medium text-red-700 dark:text-red-300">Something went wrong</p>
      <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-3 text-xs px-3 py-1.5">
          Try again
        </button>
      )}
    </div>
  );
}
