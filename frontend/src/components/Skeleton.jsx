export function SkeletonLine({ className = "" }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3 h-6" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 p-4">
            {Array.from({ length: cols }).map((__, c) => (
              <SkeletonLine key={c} className="flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-4 space-y-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/4" />
        </div>
      ))}
    </div>
  );
}
