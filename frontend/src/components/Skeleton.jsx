export function SkeletonLine({ className = "" }) {
  return <div className={`skeleton h-4 ${className}`} />;
}

export function SkeletonStat() {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2.5">
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-7 w-14" />
        </div>
        <div className="skeleton h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="w-full space-y-3">
          <SkeletonLine className="w-1/3" />
          <SkeletonLine className="h-6 w-2/3" />
          <SkeletonLine className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40">
        <SkeletonLine className="h-3 w-24" />
      </div>
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
        <div key={r} className="flex items-start justify-between gap-4 p-4">
          <div className="w-full space-y-2">
            <SkeletonLine className="w-2/3" />
            <SkeletonLine className="h-3 w-1/4" />
          </div>
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

