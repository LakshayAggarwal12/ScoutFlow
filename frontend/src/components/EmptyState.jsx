export default function EmptyState({ title, description, action }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center animate-fade-in">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
