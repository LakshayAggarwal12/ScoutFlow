import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStats, listTasks } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonCard, SkeletonList } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";

const ACTIVE_STATUSES = ["PLANNING", "QUEUED", "RUNNING"];

function StatCard({ label, value, icon }) {
  return (
    <div className="card p-5 hover:shadow-sm transition-shadow duration-200 flex items-center gap-4">
      {icon && <span className="text-2xl">{icon}</span>}
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
      </div>
    </div>
  );
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      const [statsData, activeData] = await Promise.all([
        getStats(),
        listTasks({ status: "RUNNING", limit: 5 }),
      ]);
      setStats(statsData);
      setActiveTasks(activeData?.items || []);
      setError(null);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Poll every 2.5s only while there are active tasks
  useEffect(() => {
    if (activeTasks.length === 0) return;
    const id = setInterval(loadAll, 2500);
    return () => clearInterval(id);
  }, [activeTasks.length, loadAll]);

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Overview of your data collection activity.</p>
        </div>
        <Link to="/create" className="btn-primary">
          + New Task
        </Link>
      </div>

      {loading && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && error && <div className="mt-6"><ErrorState message={error} onRetry={loadAll} /></div>}

      {!loading && !error && stats && (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon="📋" label="Total Tasks" value={stats.totalTasks} />
            <StatCard icon="⚡" label="Active Tasks" value={stats.activeTasks} />
            <StatCard icon="📦" label="Datasets" value={stats.datasets} />
            <StatCard icon="📊" label="Records Collected" value={stats.records} />
          </div>

          {/* Active tasks live feed */}
          {activeTasks.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Running Now</h2>
              </div>
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {activeTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-4 row-hover gap-3"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-md">{task.prompt}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={task.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent tasks */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Tasks</h2>
              <Link to="/tasks" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                View all →
              </Link>
            </div>
            {stats.recentTasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                description="Create your first task to start collecting real data."
                action={<Link to="/create" className="btn-primary">Create Task</Link>}
              />
            ) : (
              <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="flex items-center justify-between p-4 row-hover gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate block">{task.prompt}</span>
                      <span className="text-xs text-slate-400">{relativeTime(task.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={task.status} />
                      {task.status === "COMPLETED" && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}/dataset`);
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Dataset →
                        </button>
                      )}
                    </div>
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
