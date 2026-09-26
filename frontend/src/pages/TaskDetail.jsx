import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getTask, getLogs, cancelTask, runTask, getSourceHealth } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import PipelineChecklist from "../components/PipelineChecklist.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";

const ACTIVE_STATUSES = ["PLANNING", "QUEUED", "RUNNING"];

export default function TaskDetail() {
  const { id } = useParams();
  const { notify } = useToast();
  const [task, setTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [sourceHealth, setSourceHealth] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [taskData, logsData] = await Promise.all([getTask(id), getLogs(id)]);
      setTask(taskData);
      setLogs(logsData);
      getSourceHealth(id).then(setSourceHealth).catch(() => {});
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

  if (error) return <div className="p-8"><ErrorState message={error} onRetry={refresh} /></div>;
  if (!task) return <div className="p-8 max-w-4xl space-y-4"><SkeletonCard /><SkeletonCard /></div>;

  const stats = logs.find((l) => l.step === "PIPELINE" && l.status === "COMPLETED")?.metadata;
  const isActive = ACTIVE_STATUSES.includes(task.status);
  const usedMockData = logs.some((l) => l.message?.includes("demo/mock data"));

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 font-mono">{task.id}</p>
          <h1 className="text-lg font-semibold mt-1 max-w-2xl">{task.prompt}</h1>
          {task.retryCount > 0 && (
            <p className="text-xs text-slate-400 mt-1">Rerun #{task.retryCount}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {usedMockData && <span className="badge bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Mock data</span>}
          <StatusBadge status={task.status} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {task.status === "FAILED" && (
          <button className="btn-secondary" disabled={actionLoading} onClick={handleRetry}>
            {actionLoading === "retry" ? "Retrying..." : "Retry"}
          </button>
        )}
        {task.status === "COMPLETED" && (
          <button className="btn-secondary" disabled={actionLoading} onClick={handleRetry}>
            {actionLoading === "retry" ? "Starting..." : "Rerun"}
          </button>
        )}
        {isActive && (
          <button className="btn-danger" disabled={actionLoading || task.cancelRequested} onClick={handleCancel}>
            {task.cancelRequested ? "Cancelling..." : actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
          </button>
        )}
        <Link to={`/tasks/${id}/workflow`} className="btn-secondary">
          View Workflow
        </Link>
        {task.status === "COMPLETED" && (
          <Link to={`/tasks/${id}/dataset`} className="btn-primary">
            View Dataset
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Pipeline</h2>
          <PipelineChecklist logs={logs} taskStatus={task.status} />
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Statistics</h2>
          {stats ? (
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-slate-500 dark:text-slate-400">Discovered</dt>
              <dd className="text-right font-medium tabular-nums">{stats.discovered}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Valid</dt>
              <dd className="text-right font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{stats.valid}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Partial</dt>
              <dd className="text-right font-medium tabular-nums text-amber-600 dark:text-amber-400">{stats.partial}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Invalid</dt>
              <dd className="text-right font-medium tabular-nums text-red-600 dark:text-red-400">{stats.invalid}</dd>
              <dt className="text-slate-500 dark:text-slate-400">Duplicates removed</dt>
              <dd className="text-right font-medium tabular-nums">{stats.duplicates}</dd>
              <dt className="text-slate-700 dark:text-slate-200 font-medium">Final records</dt>
              <dd className="text-right font-semibold tabular-nums">{stats.final}</dd>
              {sourceHealth && (
                <>
                  <dt className="text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">Source health</dt>
                  <dd className="text-right pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                    <Link to="/sources" className="text-accent hover:underline text-xs">
                      {Object.entries(sourceHealth).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(", ")}
                    </Link>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Statistics will appear once collection finishes.</p>
          )}
        </div>
      </div>

      {task.structuredRequirement && (
        <div className="mt-6 card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Structured Requirement</h2>
          <pre className="text-xs bg-slate-50 dark:bg-slate-950 rounded-md p-3 overflow-x-auto">
            {JSON.stringify(task.structuredRequirement, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-6 card p-5">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Execution Log</h2>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-baseline gap-3 text-xs">
              <span className="text-slate-400 font-mono w-24 shrink-0">{log.step}</span>
              <span className={log.status === "ERROR" || log.status === "FAILED" ? "text-red-600 dark:text-red-400" : log.status === "RETRY_SCHEDULED" ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}>
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
