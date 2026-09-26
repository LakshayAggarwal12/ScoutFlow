import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStats } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonCard, SkeletonList } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";

function StatCard({ label, value }) {
  return (
    <div className="card p-5 hover:shadow-sm transition-shadow duration-200">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    getStats()
      .then(setStats)
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Overview of collection tasks and datasets.</p>

      {loading && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && error && <div className="mt-6"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && !error && stats && (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Tasks" value={stats.totalTasks} />
            <StatCard label="Active Tasks" value={stats.activeTasks} />
            <StatCard label="Datasets" value={stats.datasets} />
            <StatCard label="Records Collected" value={stats.records} />
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Tasks</h2>
            {stats.recentTasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                description="Create your first task to see it appear here."
                action={<Link to="/create" className="btn-primary">Create Task</Link>}
              />
            ) : (
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-4 row-hover"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-md">{task.prompt}</span>
                    <StatusBadge status={task.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
