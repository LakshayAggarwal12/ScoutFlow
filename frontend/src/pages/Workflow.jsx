import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { getWorkflow, getWorkflowVersions, getTask } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { IconCheck, IconLayers, IconTable } from "../components/icons.jsx";

const STEP_LABELS = {
  search: "Source Discovery",
  collect: "Data Collection",
  extract: "AI Extraction",
  normalize: "Normalization",
  filter: "Filtering",
  validate: "Validation",
  deduplicate: "Deduplication",
  store: "Store Dataset",
};

const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

export default function Workflow() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [task, setTask] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(undefined);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkflowVersions(id).then(setVersions).catch(() => {});
  }, [id]);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      getWorkflow(id, selectedVersion),
      getTask(id),
    ])
      .then(([wf, t]) => { setWorkflow(wf); setTask(t); })
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id, selectedVersion]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Live polling while task is active
  useEffect(() => {
    if (!task || TERMINAL_STATUSES.includes(task.status)) return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [task?.status, load]);


  const steps = workflow?.definition?.steps || [];
  const isComplete = workflow?.status === "COMPLETED";

  return (
    <div className="page page-md animate-fade-in">
      <PageHeader
        back={{ to: `/tasks/${id}`, label: "Back to task" }}
        eyebrow="Execution plan"
        title="Workflow"
        description="The ordered set of operations the AI planned for this task, from source discovery to storage."
        actions={
          <>
            {versions.length > 1 && (
              <select
                className="select max-w-[190px]"
                value={selectedVersion ?? ""}
                onChange={(e) => setSelectedVersion(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                aria-label="Workflow version"
              >
                <option value="">Latest (v{versions[0]?.version})</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>
                    v{v.version} - {new Date(v.createdAt).toLocaleDateString()}
                  </option>
                ))}
              </select>
            )}
            {workflow && <StatusBadge status={workflow.status} />}
          </>
        }
      />

      {versions.length > 1 && (
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <IconLayers size={14} className="mt-0.5 shrink-0" />
          {versions.length} plan versions exist for this task - one per run/rerun. Revisit any earlier one above.
        </p>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
      {!loading && error && (
        <div className="mt-5">
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

      {!loading && workflow && (
        <div className="mt-6">
          <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <IconTable size={16} />
              </span>
              <div>
                <p className="text-sm font-medium text-ink dark:text-slate-100">{steps.length} planned steps</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Executed in order, with checkpoints between stages
                </p>
              </div>
            </div>
            <Link to={`/tasks/${id}/dataset`} className="btn-secondary btn-sm">
              View dataset
            </Link>
          </div>

          <ol className="mt-5">
            {steps.map((step, idx) => {
              const isActive = workflow.status === "RUNNING" && idx === steps.length - 1;
              const isDone = isComplete;
              const isLast = idx === steps.length - 1;

              return (
                <li key={idx} className="relative flex gap-4">
                  {!isLast && (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[15px] top-[38px] h-[calc(100%-2rem)] w-px ${
                        isDone ? "bg-emerald-200 dark:bg-emerald-900/70" : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 mt-1 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-200 ${
                      isDone
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : isActive
                          ? "border-accent/30 bg-accent/10 text-accent ring-4 ring-accent/10"
                          : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
                    }`}
                  >
                    {isDone ? (
                      <IconCheck size={14} />
                    ) : isActive ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                    ) : (
                      idx + 1
                    )}
                  </span>

                  <div
                    className={`card mb-3 w-full min-w-0 px-4 py-3.5 transition-all duration-200 ${
                      isActive ? "border-accent/40 ring-1 ring-accent/20" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink dark:text-slate-100">
                          {STEP_LABELS[step.type] || step.type}
                        </p>
                        {step.purpose && (
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {step.purpose}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {isActive && (
                          <span className="tag bg-accent/10 text-accent-700 dark:bg-accent/15 dark:text-accent-300">
                            running
                          </span>
                        )}
                        <span className="tag font-mono">{step.type}</span>
                      </div>
                    </div>

                    {step.fields && step.fields.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {step.fields.map((field) => (
                          <span key={field} className="tag">
                            {field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
