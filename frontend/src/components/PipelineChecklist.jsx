import { IconAlert, IconCheck } from "./icons.jsx";
import { relativeTime } from "../lib/format.js";

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

// Visual treatment per derived step state.
const NODE_STYLES = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400",
  active: "border-accent/30 bg-accent/10 text-accent ring-4 ring-accent/10 dark:border-accent/40",
  error: "border-red-200 bg-red-50 text-red-600 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-400",
  pending: "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500",
};

const LABEL_STYLES = {
  done: "text-slate-700 dark:text-slate-200",
  active: "font-semibold text-accent-700 dark:text-accent-300",
  error: "font-semibold text-red-700 dark:text-red-300",
  pending: "text-slate-400 dark:text-slate-500",
};

function lastLogFor(logs, stepKey) {
  let found = null;
  for (const log of logs) {
    if (log.step === stepKey) found = log;
  }
  return found;
}

// Derives per-step state from the raw execution log rows.
export default function PipelineChecklist({ logs, taskStatus }) {
  const completedSteps = new Set(logs.filter((l) => l.status === "COMPLETED").map((l) => l.step));
  const runningSteps = new Set(logs.filter((l) => l.status === "RUNNING").map((l) => l.step));
  const erroredSteps = new Set(logs.filter((l) => l.status === "ERROR" || l.status === "FAILED").map((l) => l.step));

  return (
    <ol className="relative">
      {STEP_ORDER.map((step, idx) => {
        let state = "pending";
        if (completedSteps.has(step.key)) state = "done";
        else if (runningSteps.has(step.key)) state = "active";
        else if (erroredSteps.has(step.key) || (taskStatus === "FAILED" && !completedSteps.has(step.key))) {
          state = erroredSteps.has(step.key) ? "error" : "pending";
        }

        const log = lastLogFor(logs, step.key);
        const isLast = idx === STEP_ORDER.length - 1;

        return (
          <li key={step.key} className="relative flex gap-3">
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute left-[15px] top-[34px] h-[calc(100%-1.75rem)] w-px ${
                  state === "done" ? "bg-emerald-200 dark:bg-emerald-900/70" : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            )}
            <span
              className={`relative z-10 mt-1 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors duration-200 ${NODE_STYLES[state]}`}
            >
              {state === "done" ? (
                <IconCheck size={14} />
              ) : state === "error" ? (
                <IconAlert size={14} />
              ) : state === "active" ? (
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              ) : (
                idx + 1
              )}
            </span>
            <div className={`min-w-0 flex-1 pb-4 ${LABEL_STYLES[state]}`}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-tight">
                <span>{step.label}</span>
                {state === "active" && (
                  <span className="tag bg-accent/10 text-accent-700 dark:bg-accent/15 dark:text-accent-300">running</span>
                )}
                {state === "error" && (
                  <span className="tag bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">failed</span>
                )}
                {log?.createdAt && (
                  <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
                    {relativeTime(log.createdAt)}
                  </span>
                )}
              </div>
              {log?.message && (
                <p
                  className="mt-0.5 truncate text-xs font-normal text-slate-500 dark:text-slate-400"
                  title={log.message}
                >
                  {log.message}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

