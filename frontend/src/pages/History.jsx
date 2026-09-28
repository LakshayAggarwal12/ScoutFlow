import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTasks, deleteTask } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { statusLabel } from "../lib/status.js";
import { SkeletonList } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { IconChevronRight, IconClock, IconSparkles, IconTrash } from "../components/icons.jsx";
import { dayLabel, formatTime, shortId } from "../lib/format.js";

const ACTIVE_STATUSES = ["PLANNING", "QUEUED", "RUNNING"];
const STATUSES = ["", "COMPLETED", "FAILED", "RUNNING", "CANCELLED"];

export default function History() {
  const { notify } = useToast();
  const [statusFilter, setStatusFilter] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    listTasks({ limit: 50, status: statusFilter || undefined })
      .then((d) => setTasks(d.items))
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteTask(pendingDelete.id);
      notify("Task deleted", "success");
      setPendingDelete(null);
      load();
    } catch (err) {
      notify(err.response?.data?.error || err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  // Group the loaded tasks by day for a scannable activity timeline.
  const groups = tasks.reduce((acc, task) => {
    const label = dayLabel(task.createdAt);
    const bucket = acc.find((g) => g.label === label);
    if (bucket) bucket.items.push(task);
    else acc.push({ label, items: [task] });
    return acc;
  }, []);

  return (
    <div className="page page-md animate-fade-in">
      <PageHeader
        eyebrow="Data"
        title="History"
        description="All collection tasks, most recent first."
        actions={
          <Link to="/create" className="btn-primary">
            <IconSparkles size={16} />
            New Task
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`chip ${statusFilter === s ? "chip-active" : "chip-idle"}`}
            >
              {s ? statusLabel(s) : "All"}
            </button>
          ))}
        </div>
        {!loading && !error && tasks.length > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500">Showing latest {tasks.length}</span>
        )}
      </div>

      <div className="mt-5">
        {loading && <SkeletonList rows={6} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && tasks.length === 0 && (
          <EmptyState
            icon={IconClock}
            title="No tasks found"
            description="Try a different status filter, or create a new task."
            action={
              <Link to="/create" className="btn-primary">
                <IconSparkles size={16} />
                Create Task
              </Link>
            }
          />
        )}
        {!loading && !error && tasks.length > 0 && (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="mb-2 flex items-center gap-3">
                  <h2 className="eyebrow">{group.label}</h2>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                    {group.items.length}
                  </span>
                </div>
                <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
                  {group.items.map((task) => (
                    <div key={task.id} className="group flex items-center gap-4 px-4 py-3.5 row-hover sm:px-5">
                      <span className="hidden w-20 shrink-0 font-mono text-xs text-slate-400 sm:block dark:text-slate-500">
                        {formatTime(task.createdAt)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{task.prompt}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-400 dark:text-slate-500">
                          <span className="font-mono">{shortId(task.id)}…</span>
                          {task.retryCount > 0 && <span>· rerun #{task.retryCount}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={task.status} />
                        <Link to={`/tasks/${task.id}`} className="btn-secondary btn-xs">
                          Open
                          <IconChevronRight size={13} />
                        </Link>
                        {!ACTIVE_STATUSES.includes(task.status) && (
                          <button
                            type="button"
                            className="btn-icon-sm opacity-0 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:text-red-400"
                            title="Delete task"
                            aria-label="Delete task"
                            onClick={() => setPendingDelete(task)}
                          >
                            <IconTrash size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this task?"
        description={pendingDelete ? `"${pendingDelete.prompt}" and its dataset/history will be permanently removed.` : ""}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

