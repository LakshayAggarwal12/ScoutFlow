import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listTasks, deleteTask } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { statusLabel } from "../lib/status.js";
import { SkeletonList } from "../components/Skeleton.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Pagination from "../components/Pagination.jsx";
import { IconChevronRight, IconSparkles, IconTasks, IconTrash } from "../components/icons.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatNumber, relativeTime, shortId } from "../lib/format.js";

const PAGE_SIZE = 20;
const STATUSES = ["", "PLANNING", "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"];
const ACTIVE = ["PLANNING", "QUEUED", "RUNNING"];
const ROW_GRID = "md:grid md:grid-cols-[minmax(0,1fr)_140px_140px_170px] md:items-center md:gap-4";

export default function TaskList() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="page page-lg animate-fade-in">
      <PageHeader
        eyebrow="Workspace"
        title="All Tasks"
        description="All your collection tasks and their status."
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
              onClick={() => {
                setPage(1);
                setStatus(s);
              }}
              className={`chip ${status === s ? "chip-active" : "chip-idle"}`}
            >
              {s ? statusLabel(s) : "All"}
            </button>
          ))}
        </div>
        {!loading && data && (
          <span className="text-xs tabular-nums text-slate-400 dark:text-slate-500">
            {formatNumber(data.total)} {data.total === 1 ? "task" : "tasks"}
          </span>
        )}
      </div>

      <div className="mt-4">
        {loading && <SkeletonList rows={8} />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data?.items?.length === 0 && (
          <EmptyState
            icon={IconTasks}
            title="No tasks found"
            description={
              status
                ? `No tasks with status "${statusLabel(status)}".`
                : "Create your first task to start collecting data."
            }
            action={
              <Link to="/create" className="btn-primary">
                <IconSparkles size={16} />
                Create Task
              </Link>
            }
          />
        )}
        {!loading && !error && data?.items?.length > 0 && (
          <>
            <div className="card overflow-hidden">
              <div
                className={`hidden border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[minmax(0,1fr)_140px_140px_170px] md:gap-4 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400`}
              >
                <span>Task</span>
                <span>Status</span>
                <span>Created</span>
                <span className="text-right">Actions</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className={`group grid grid-cols-1 gap-3 px-5 py-4 row-hover ${ROW_GRID}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{task.prompt}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                        <span className="font-mono">{shortId(task.id)}…</span>
                        {task.retryCount > 0 && <span className="tag">Run #{task.retryCount + 1}</span>}
                        <span className="md:hidden">{relativeTime(task.createdAt)}</span>
                      </div>
                    </div>

                    <div>
                      <StatusBadge status={task.status} />
                    </div>

                    <div className="hidden text-xs text-slate-500 md:block dark:text-slate-400">
                      {relativeTime(task.createdAt)}
                    </div>

                    <div className="flex items-center gap-2 md:justify-end">
                      {task.status === "COMPLETED" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}/dataset`);
                          }}
                          className="btn-secondary btn-xs"
                        >
                          Dataset
                          <IconChevronRight size={13} />
                        </button>
                      )}
                      {!ACTIVE.includes(task.status) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingDelete(task);
                          }}
                          className="btn-icon-sm opacity-0 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 dark:hover:text-red-400"
                          title="Delete task"
                          aria-label="Delete task"
                        >
                          <IconTrash size={15} />
                        </button>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <Pagination
              className="mt-4"
              page={page}
              totalPages={totalPages}
              total={data.total}
              unit="task"
              onChange={setPage}
              loading={loading}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this task?"
        description={
          pendingDelete
            ? `"${pendingDelete.prompt}" and its dataset, sources and history will be permanently removed.`
            : ""
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

