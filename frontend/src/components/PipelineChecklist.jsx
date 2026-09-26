const STEP_ORDER = [
  { key: "REQUIREMENT", label: "Requirement understood" },
  { key: "PLANNING", label: "Workflow generated" },
  { key: "COLLECTION", label: "Sources collected" },
  { key: "EXTRACTION", label: "Extraction" },
  { key: "NORMALIZATION", label: "Cleaning / normalization" },
  { key: "DEDUPLICATION", label: "Deduplication" },
  { key: "VALIDATION", label: "Validation" },
  { key: "STORAGE", label: "Storage" },
];

function iconFor(state) {
  if (state === "done") return <span className="text-emerald-600 dark:text-emerald-400">✓</span>;
  if (state === "active") return <span className="text-blue-600 dark:text-blue-400 inline-block animate-pulse">◉</span>;
  if (state === "error") return <span className="text-red-600 dark:text-red-400">✗</span>;
  return <span className="text-slate-300 dark:text-slate-700">○</span>;
}

// Derives per-step state from the raw execution log rows.
export default function PipelineChecklist({ logs, taskStatus }) {
  const completedSteps = new Set(logs.filter((l) => l.status === "COMPLETED").map((l) => l.step));
  const runningSteps = new Set(logs.filter((l) => l.status === "RUNNING").map((l) => l.step));
  const erroredSteps = new Set(logs.filter((l) => l.status === "ERROR" || l.status === "FAILED").map((l) => l.step));

  return (
    <ol className="space-y-2">
      {STEP_ORDER.map((step) => {
        let state = "pending";
        if (completedSteps.has(step.key)) state = "done";
        else if (runningSteps.has(step.key)) state = "active";
        else if (erroredSteps.has(step.key) || (taskStatus === "FAILED" && !completedSteps.has(step.key))) {
          state = erroredSteps.has(step.key) ? "error" : "pending";
        }
        return (
          <li key={step.key} className="flex items-center gap-2.5 text-sm transition-colors duration-200">
            <span className="w-4 text-center font-mono">{iconFor(state)}</span>
            <span
              className={
                state === "done"
                  ? "text-slate-700 dark:text-slate-200"
                  : state === "active"
                  ? "text-blue-700 dark:text-blue-400 font-medium"
                  : "text-slate-400 dark:text-slate-600"
              }
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
