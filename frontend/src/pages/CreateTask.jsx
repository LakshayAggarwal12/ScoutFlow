import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { IconAlert, IconBrain, IconShield, IconSparkles, IconTarget } from "../components/icons.jsx";

const EXAMPLE_PROMPTS = [
  {
    label: "Jobs",
    prompt: "Find 30 remote backend engineering jobs posted in the last 7 days. Return company name, role, location, salary, posting date and application URL.",
  },
  {
    label: "Startups",
    prompt: "Find 20 AI startups in India that raised funding in 2024. Return company name, industry, founding year, funding amount, location, and website.",
  },
  {
    label: "Research",
    prompt: "Find 15 recent research papers on large language models published in 2024. Return title, authors, abstract summary, publication date, and link.",
  },
  {
    label: "Leads",
    prompt: "Find 25 SaaS companies in Bangalore. Return company name, product description, employee count, website, and LinkedIn URL.",
  },
  {
    label: "Internships",
    prompt: "Find 50 AI/ML internships in India posted in the last 7 days. Return company, role, location, stipend, posting date and application URL.",
  },
];

// Short, factual notes about what happens after the task is created.
const PIPELINE_NOTES = [
  {
    icon: IconBrain,
    title: "Interpreted, not guessed",
    desc: "The requirement becomes a structured spec of entity, fields, location, time window and quantity.",
  },
  {
    icon: IconTarget,
    title: "Planned, then executed",
    desc: "A multi-step workflow of safe, predefined operations runs in the background.",
  },
  {
    icon: IconShield,
    title: "Verified and traceable",
    desc: "Rows are deduplicated, validated and kept linked to their original source.",
  },
];

export default function CreateTask() {
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { notify } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const task = await createTask(prompt.trim());
      notify("Task created - running now", "success");
      navigate(`/tasks/${task.id}`);
    } catch (err) {
      const message = err.response?.data?.error || err.message;
      setError(message);
      notify(message, "error");
      setSubmitting(false);
    }
  }

  return (
    <div className="page page-md animate-fade-in">
      <PageHeader
        eyebrow="Workspace"
        title="Create Task"
        description="Describe the data you need in plain language. The AI service will turn it into a structured requirement and workflow, then run it in the background."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Composer */}
        <form onSubmit={handleSubmit} className="card card-pad lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <label htmlFor="task-prompt" className="section-title">
                Data requirement
              </label>
              <p className="section-sub">Be specific about entity, fields, quantity, location and time window.</p>
            </div>
            <span className="tag tabular-nums">{prompt.length} chars</span>
          </div>

          <textarea
            id="task-prompt"
            className="textarea mt-4 min-h-[190px]"
            placeholder="e.g. Find 30 remote backend engineering jobs posted in the last 7 days. Return company, role, location, salary and application URL."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />

          {error && (
            <p className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <IconAlert size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="hidden items-center gap-1.5 text-xs text-slate-400 sm:flex dark:text-slate-500">
              <span className="kbd">Ctrl</span>
              <span className="kbd">↵</span>
              to submit
            </p>
            <div className="flex items-center gap-2">
              {prompt && (
                <button type="button" className="btn-ghost btn-sm" onClick={() => setPrompt("")} disabled={submitting}>
                  Clear
                </button>
              )}
              <button type="submit" disabled={submitting || !prompt.trim()} className="btn-primary">
                {submitting ? (
                  <>
                    <span className="spinner" />
                    Creating…
                  </>
                ) : (
                  <>
                    <IconSparkles size={16} />
                    Create Task
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Examples + context */}
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="panel-head">
              <div>
                <h2 className="section-title">Example requests</h2>
                <p className="section-sub">Tap one to load it into the composer</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {EXAMPLE_PROMPTS.map((example) => {
                const isActive = prompt === example.prompt;
                return (
                  <button
                    key={example.label}
                    type="button"
                    onClick={() => setPrompt(example.prompt)}
                    aria-pressed={isActive}
                    className={`block w-full px-4 py-3 text-left transition-colors duration-150 ${
                      isActive
                        ? "bg-accent/[0.06] dark:bg-accent/10"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {example.label}
                      </span>
                      {isActive && <span className="tag bg-accent/10 text-accent-700 dark:bg-accent/15 dark:text-accent-300">Loaded</span>}
                    </span>
                    <span className="mt-1.5 line-clamp-3 block text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {example.prompt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card card-pad">
            <h2 className="section-title">What happens next</h2>
            <ul className="mt-3 space-y-3.5">
              {PIPELINE_NOTES.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Icon size={16} />
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-ink dark:text-slate-100">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

