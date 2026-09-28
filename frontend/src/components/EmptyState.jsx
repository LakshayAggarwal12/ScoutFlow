import { IconInbox } from "./icons.jsx";

export default function EmptyState({ title, description, action, icon: Icon = IconInbox, className = "" }) {
  return (
    <div className={`card flex flex-col items-center px-6 py-14 text-center animate-fade-in ${className}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={22} />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink dark:text-slate-100">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

