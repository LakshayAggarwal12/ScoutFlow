import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

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
    <div className="p-8 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-semibold">Create Task</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Describe the data you need in plain language. The AI service will turn it into a structured
        requirement and workflow, then run it in the background.
      </p>

      <form onSubmit={handleSubmit} className="mt-6">
        <textarea
          className="input min-h-[140px] resize-y"
          placeholder="Describe what data you need..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={submitting || !prompt.trim()} className="btn-primary mt-3">
          {submitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            "Create Task"
          )}
        </button>
      </form>

      <div className="mt-8">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Try an example</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example.label}
              onClick={() => setPrompt(example.prompt)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 border ${
                prompt === example.prompt
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500"
              }`}
            >
              {example.label}
            </button>
          ))}
        </div>
        {EXAMPLE_PROMPTS.map((example) =>
          prompt === example.prompt ? (
            <p key={example.label} className="text-sm text-slate-600 dark:text-slate-300 card p-3 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              {example.prompt}
            </p>
          ) : null
        )}
      </div>
    </div>
  );
}
