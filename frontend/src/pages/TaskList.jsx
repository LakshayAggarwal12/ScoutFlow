import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listTasks, deleteTask } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonList } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import { useToast } from "../context/ToastContext.jsx";

const PAGE_SIZE = 20;
const STATUSES = ["", "PLANNING", "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
const ACTIVE = ["PLANNING", "QUEUED", "RUNNING"];

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function TaskList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { notify } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listTasks({ page, limit: PAGE_SIZE, status: status || undefined })
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(load, [load]);

  // Auto-refresh if any active tasks
  useEffect(() => {
    const hasActive = data?.items?.some((t) => ACTIVE.includes(t.status));
    if (!hasActive) return;
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [data, load]);

  async function handleDelete(e, taskId) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this task and all its data?")) return;
    try {
      await deleteTask(taskId);
      notify("Task deleted", "success");
      load();
    } catch (err) {
      notify(err.response?.data?.error || err.message, "error");
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="p-8 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">All Tasks</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            All your collection tasks and their status.
          </p>
        </div>
        <Link to="/create" className="btn-primary">
          + New Task
        </Link>
      </div>

      <div className="mt-5 flex gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setPage(1); setStatus(s); }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                status === s
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {loading && <SkeletonList rows={8} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data?.items?.length === 0 && (
          <EmptyState
            title="No tasks found"
            description={status ? `No tasks with status "${status}".` : "Create your first task to start collecting data."}
            action={<Link to="/create" className="btn-primary">Create Task</Link>}
          />
        )}
        {!loading && !error && data?.items?.length > 0 && (
          <>
            <div className="card divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks/${task.id}`}
                  className="flex items-start justify-between p-4 row-hover gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {task.prompt}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400 font-mono">{task.id.slice(0, 8)}…</span>
                      <span className="text-xs text-slate-400">{relativeTime(task.createdAt)}</span>
                      {task.retryCount > 0 && (
                        <span className="text-xs text-slate-400">Run #{task.retryCount + 1}</span>
                      )}
                    </div>
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
                    {!ACTIVE.includes(task.status) && (
                      <button
                        onClick={(e) => handleDelete(e, task.id)}
                        className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                        title="Delete task"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{data.total} task{data.total !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
