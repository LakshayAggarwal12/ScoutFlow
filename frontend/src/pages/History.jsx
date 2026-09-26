import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTasks } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";

export default function History() {
  const [statusFilter, setStatusFilter] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    listTasks({ limit: 50, status: statusFilter || undefined })
      .then((d) => setTasks(d.items))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <h1 className="text-xl font-semibold">History</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">All collection tasks, most recent first.</p>

      <div className="mt-5">
        <select className="input max-w-[180px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="mt-6">
        {loading && <SkeletonList rows={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && tasks.length === 0 && (
          <EmptyState title="No tasks found" description="Try a different status filter, or create a new task." />
        )}
        {!loading && !error && tasks.length > 0 && (
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 gap-4 row-hover">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{task.prompt}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(task.createdAt).toLocaleString()}
                    {task.retryCount > 0 && ` · rerun #${task.retryCount}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={task.status} />
                  <Link to={`/tasks/${task.id}`} className="btn-secondary px-3 py-1.5">
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
