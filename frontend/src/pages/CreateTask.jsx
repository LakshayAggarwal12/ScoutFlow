import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTask } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";

const EXAMPLE_PROMPTS = [
  "Find 50 AI internships in India posted in the last 7 days. Return company, role, location, salary, posting date and application URL.",
  "Find backend development internships in Bangalore and return company, role, location, salary, date posted and application URL.",
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
      notify("Task created — running now", "success");
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
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Example prompts</p>
        <div className="space-y-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="block w-full text-left text-sm text-slate-600 dark:text-slate-300 card p-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors duration-150"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
