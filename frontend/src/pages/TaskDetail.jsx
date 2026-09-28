import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getTask, getLogs, getDataset, cancelTask, runTask, getSourceHealth, deleteTask } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import PipelineChecklist from "../components/PipelineChecklist.jsx";
import MockDataBadge from "../components/MockDataBadge.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import PageHeader from "../components/PageHeader.jsx";
import {
  IconActivity,
  IconArrowUpRight,
  IconCopy,
  IconLayers,
  IconRefresh,
  IconStop,
  IconTable,
  IconTerminal,
  IconTrash,
} from "../components/icons.jsx";
import { formatNumber, formatTime, relativeTime, shortId } from "../lib/format.js";

const ACTIVE_STATUSES = ["PLANNING", "QUEUED", "RUNNING"];

// Log line severity → presentation colour.
function logTone(status) {
  if (status === "ERROR" || status === "FAILED") return "text-red-600 dark:text-red-400";
  if (status === "RETRY_SCHEDULED") return "text-amber-600 dark:text-amber-400";
  if (status === "RUNNING") return "text-accent-700 dark:text-accent-300";
  return "text-slate-600 dark:text-slate-300";
}

function logDot(status) {
  if (status === "ERROR" || status === "FAILED") return "bg-red-500";
  if (status === "RETRY_SCHEDULED") return "bg-amber-500";
  if (status === "RUNNING") return "bg-accent animate-pulse";
  return "bg-emerald-500";
}

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [task, setTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [dataset, setDataset] = useState(null);
  const [sourceHealth, setSourceHealth] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [taskData, logsData] = await Promise.all([getTask(id), getLogs(id)]);
      setTask(taskData);
      setLogs(logsData);
      getSourceHealth(id).then(setSourceHealth).catch(() => {});
      // The dataset row carries the authoritative usedMockData flag; it only
      // exists once a run produced one (404 before that).
      getDataset(id)
        .then(setDataset)
        .catch(() => setDataset(null));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      if (task && !ACTIVE_STATUSES.includes(task.status) && task.status !== "DRAFT" && task.status !== "QUEUED") return;
      refresh();
    }, 1500);
    return () => clearInterval(interval);
  }, [refresh, task?.status]);

  async function handleRetry() {
    setActionLoading("retry");
    try {
      await runTask(id);
      notify("Task re-queued", "success");
      await refresh();
    } catch (err) {
      notify(err.response?.data?.error || err.message, "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    setActionLoading("cancel");
    try {
      await cancelTask(id);
      notify("Cancellation requested", "info");
      await refresh();
    } catch (err) {
      notify(err.response?.data?.error || err.message, "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    setActionLoading("delete");
    try {
      await deleteTask(id);
      notify("Task deleted", "success");
      navigate("/history");
    } catch (err) {
      notify(err.response?.data?.error || err.message, "error");
      setActionLoading(null);
      setConfirmDelete(false);
    }
  }

  async function copyRequirement() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(task.structuredRequirement, null, 2));
      notify("Requirement JSON copied", "success");
    } catch {
      notify("Copy failed - select the text manually", "error");
    }
  }

  if (error) {
    return (
      <div className="page page-md animate-fade-in">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }
  if (!task) {
    return (
      <div className="page page-md animate-fade-in space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const stats = logs.find((l) => l.step === "PIPELINE" && l.status === "COMPLETED")?.metadata;
  const isActive = ACTIVE_STATUSES.includes(task.status);
  // Prefer the dataset's authoritative flag; fall back to log sniffing only
  // while no dataset exists yet (log-wording inference broke whenever wording
  // changed - e.g. the new fallback messages).
  const usedMockData = dataset
    ? dataset.usedMockData
    : logs.some((l) => l.message?.toLowerCase().includes("demo"));
  const totalChecked = stats ? (stats.valid || 0) + (stats.partial || 0) + (stats.invalid || 0) : 0;
  const pct = (value) => (totalChecked > 0 ? Math.round((value / totalChecked) * 100) : 0);

  return (
    <div className="page page-md animate-fade-in">
      <PageHeader
        back={{ to: "/tasks", label: "All tasks" }}
        meta={
          <>
            <span className="tag font-mono" title={task.id}>
              {shortId(task.id, 10)}…
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Created {relativeTime(task.createdAt)}
            </span>
            {task.retryCount > 0 && <span className="tag">Rerun #{task.retryCount}</span>}
          </>
        }
        title={task.prompt}
        actions={
          <>
            {usedMockData && <MockDataBadge />}
            <StatusBadge status={task.status} />
          </>
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {isActive && (
          <button className="btn-danger btn-sm" disabled={actionLoading || task.cancelRequested} onClick={handleCancel}>
            {actionLoading === "cancel" || task.cancelRequested ? (
              <>
                <span className="spinner" />
                Cancelling…
              </>
            ) : (
              <>
                <IconStop size={15} />
                Cancel
              </>
            )}
          </button>
        )}
        {task.status === "FAILED" && (
          <button className="btn-secondary btn-sm" disabled={actionLoading} onClick={handleRetry}>
            {actionLoading === "retry" ? (
              <>
                <span className="spinner" />
                Retrying…
              </>
            ) : (
              <>
                <IconRefresh size={15} />
                Retry
              </>
            )}
          </button>
        )}
        {task.status === "COMPLETED" && (
          <button className="btn-secondary btn-sm" disabled={actionLoading} onClick={handleRetry}>
            {actionLoading === "retry" ? (
              <>
                <span className="spinner" />
                Starting…
              </>
            ) : (
              <>
                <IconRefresh size={15} />
                Rerun
              </>
            )}
          </button>
        )}
        <Link to={`/tasks/${id}/workflow`} className="btn-secondary btn-sm">
          <IconLayers size={15} />
          View Workflow
        </Link>
        {task.status === "COMPLETED" && (
          <Link to={`/tasks/${id}/dataset`} className="btn-accent btn-sm">
            <IconTable size={15} />
            View Dataset
          </Link>
        )}
        {!isActive && (
          <button
            className="btn-ghost btn-sm ml-auto hover:text-red-600 dark:hover:text-red-400"
            onClick={() => setConfirmDelete(true)}
          >
            <IconTrash size={15} />
            Delete
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this task?"
        description="This permanently removes the task, its workflow history, sources, and dataset. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={actionLoading === "delete"}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="card">
          <div className="panel-head">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <IconActivity size={16} />
              </span>
              <div>
                <h2 className="section-title">Pipeline</h2>
                <p className="section-sub">Stage-by-stage execution state</p>
              </div>
            </div>
            {isActive && (
              <span className="tag bg-accent/10 text-accent-700 dark:bg-accent/15 dark:text-accent-300">live</span>
            )}
          </div>
          <div className="p-5">
            <PipelineChecklist logs={logs} taskStatus={task.status} />
          </div>
        </section>

        <section className="card">
          <div className="panel-head">
            <div>
              <h2 className="section-title">Statistics</h2>
              <p className="section-sub">Record counts from the last completed run</p>
            </div>
            {sourceHealth && (
              <Link to="/sources" className="btn-ghost btn-xs">
                Source health
                <IconArrowUpRight size={13} />
              </Link>
            )}
          </div>

          <div className="p-5">
            {stats ? (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="stat-tile">
                    <p className="stat-label">Discovered</p>
                    <p className="stat-value">{formatNumber(stats.discovered)}</p>
                  </div>
                  <div className="stat-tile">
                    <p className="stat-label">Valid</p>
                    <p className="stat-value text-emerald-600 dark:text-emerald-400">{formatNumber(stats.valid)}</p>
                  </div>
                  <div className="stat-tile">
                    <p className="stat-label">Partial</p>
                    <p className="stat-value text-amber-600 dark:text-amber-400">{formatNumber(stats.partial)}</p>
                  </div>
                  <div className="stat-tile">
                    <p className="stat-label">Invalid</p>
                    <p className="stat-value text-red-600 dark:text-red-400">{formatNumber(stats.invalid)}</p>
                  </div>
                  <div className="stat-tile">
                    <p className="stat-label">Duplicates</p>
                    <p className="stat-value">{formatNumber(stats.duplicates)}</p>
                  </div>
                  <div className="stat-tile">
                    <p className="stat-label">Final records</p>
                    <p className="stat-value">{formatNumber(stats.final)}</p>
                  </div>
                </div>

                {totalChecked > 0 && (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Validation mix</span>
                      <span className="tabular-nums">{formatNumber(totalChecked)} checked</span>
                    </div>
                    <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="bg-emerald-500" style={{ width: `${pct(stats.valid || 0)}%` }} />
                      <span className="bg-amber-500" style={{ width: `${pct(stats.partial || 0)}%` }} />
                      <span className="bg-red-500" style={{ width: `${pct(stats.invalid || 0)}%` }} />
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Valid {pct(stats.valid || 0)}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-500" /> Partial {pct(stats.partial || 0)}%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" /> Invalid {pct(stats.invalid || 0)}%
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                  <IconActivity size={18} />
                </span>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Statistics will appear once collection finishes.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {task.structuredRequirement && (
        <section className="card mt-6">
          <div className="panel-head">
            <div>
              <h2 className="section-title">Structured Requirement</h2>
              <p className="section-sub">The specification the AI extracted from your prompt</p>
            </div>
            <button type="button" className="btn-secondary btn-xs" onClick={copyRequirement}>
              <IconCopy size={13} />
              Copy JSON
            </button>
          </div>
          <div className="p-5">
            <pre className="scroll-thin max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300">
              {JSON.stringify(task.structuredRequirement, null, 2)}
            </pre>
          </div>
        </section>
      )}

      <section className="card mt-6">
        <div className="panel-head">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <IconTerminal size={16} />
            </span>
            <div>
              <h2 className="section-title">Execution Log</h2>
              <p className="section-sub">Raw step-by-step messages from the worker</p>
            </div>
          </div>
          <span className="tag tabular-nums">{logs.length} entries</span>
        </div>
        <div className="scroll-thin max-h-80 overflow-y-auto p-2">
          {logs.length === 0 ? (
            <p className="p-3 text-sm text-slate-500 dark:text-slate-400">No log entries yet.</p>
          ) : (
            <ul className="space-y-0.5">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start gap-3 rounded-md px-3 py-2 transition-colors duration-150 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${logDot(log.status)}`} />
                  <span className="w-28 shrink-0 truncate font-mono text-[11px] uppercase text-slate-400 dark:text-slate-500">
                    {log.step}
                  </span>
                  <span className={`min-w-0 flex-1 text-xs leading-relaxed ${logTone(log.status)}`}>
                    {log.message}
                  </span>
                  {log.createdAt && (
                    <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-slate-400 sm:block dark:text-slate-500">
                      {formatTime(log.createdAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
