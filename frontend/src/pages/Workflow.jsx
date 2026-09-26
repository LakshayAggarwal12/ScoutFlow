import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getWorkflow } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";
import ErrorState from "../components/ErrorState.jsx";

const STEP_LABELS = {
  search: "Source Discovery",
  collect: "Data Collection",
  extract: "Extraction",
  normalize: "Normalization",
  filter: "Filtering",
  validate: "Validation",
  deduplicate: "Deduplication",
  store: "Store Dataset",
};

export default function Workflow() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(null);
    getWorkflow(id)
      .then(setWorkflow)
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <Link to={`/tasks/${id}`} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150">
        ← Back to task
      </Link>
      <div className="flex items-center justify-between mt-3">
        <h1 className="text-xl font-semibold">Workflow</h1>
        {workflow && <StatusBadge status={workflow.status} />}
      </div>

      {loading && <div className="mt-6"><SkeletonCard /></div>}
      {!loading && error && <div className="mt-4"><ErrorState message={error} onRetry={load} /></div>}

      {!loading && workflow && (
        <div className="mt-6 flex flex-col items-center gap-0">
          {workflow.definition.steps.map((step, idx) => {
            const isActive = workflow.status === "RUNNING" && idx === workflow.definition.steps.length - 1;
            return (
              <div key={idx} className="w-full flex flex-col items-center">
                <div
                  className={`card w-72 px-4 py-3 text-center transition-all duration-200 ${
                    isActive ? "border-blue-400 dark:border-blue-500 shadow-sm scale-[1.02]" : ""
                  }`}
                >
                  <p className="text-sm font-medium">{STEP_LABELS[step.type] || step.type}</p>
                  {step.purpose && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.purpose}</p>}
                  {step.fields && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{step.fields.join(", ")}</p>
                  )}
                </div>
                {idx < workflow.definition.steps.length - 1 && (
                  <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
