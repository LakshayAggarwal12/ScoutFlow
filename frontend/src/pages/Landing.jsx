import { Link } from "react-router-dom";
import Logo from "../components/Logo.jsx";

const STEPS = [
  {
    icon: "📝",
    title: "Describe in plain language",
    desc: "Tell ScoutFlow what data you need — jobs, startups, research, contacts — in natural language.",
  },
  {
    icon: "🤖",
    title: "AI plans the workflow",
    desc: "The AI parses your requirement, designs a multi-step collection workflow, and runs it in the background.",
  },
  {
    icon: "🔍",
    title: "Real data collected & cleaned",
    desc: "Sources are hit, data extracted, deduplicated, validated, and scored for confidence — automatically.",
  },
  {
    icon: "📊",
    title: "Explore & export",
    desc: "Browse records with search/filter/sort, view source provenance, and export to CSV, JSON or XLSX.",
  },
];

const FEATURES = [
  { label: "Multi-source collection", desc: "Combines public APIs and configurable search providers" },
  { label: "AI-powered extraction", desc: "Groq LLM structures raw content into typed fields" },
  { label: "Deduplication", desc: "Explainable key-based dedup removes noise before storage" },
  { label: "Validation & confidence", desc: "Rule-based validation scores every record 0–1" },
  { label: "Full provenance", desc: "Every record links back to its source URL" },
  { label: "Dataset versioning", desc: "Each re-run creates a new version — compare anytime" },
  { label: "Background workers", desc: "BullMQ queue with retries, cancellation, status polling" },
  { label: "Export anywhere", desc: "CSV, JSON, and XLSX with one click" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Nav */}
      <header className="border-b border-slate-800 sticky top-0 z-30 bg-slate-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold tracking-tight text-white">ScoutFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors duration-150">
              Log in
            </Link>
            <Link
              to="/register"
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md font-medium transition-colors duration-150"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Real data · No scrapers required
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight text-white max-w-3xl mx-auto">
          Turn any data request into a{" "}
          <span className="text-blue-400">structured dataset</span>
        </h1>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Describe what you need in plain English. ScoutFlow&apos;s AI pipeline collects, cleans,
          deduplicates, and validates the data — then delivers a searchable, exportable dataset.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-semibold text-base transition-colors duration-150 w-full sm:w-auto text-center"
          >
            Get Started Free
          </Link>
          <Link
            to="/login"
            className="border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-3 rounded-lg font-semibold text-base transition-colors duration-150 w-full sm:w-auto text-center"
          >
            Log In
          </Link>
        </div>
        {/* Example prompt */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left">
            <p className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-wider">Example request</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              &ldquo;Find 50 remote backend engineering jobs posted in the last 7 days. Return company name, role, location, salary range, posting date, and application URL.&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">17 records collected</span>
              <span className="text-xs bg-blue-950/60 text-blue-400 border border-blue-800/50 px-2 py-0.5 rounded-full">0 duplicates</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">Confidence 0.95</span>
              <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">CSV · JSON · XLSX</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="text-3xl mb-4">{step.icon}</div>
                <div className="text-xs font-mono text-slate-500 mb-2">Step {i + 1}</div>
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-12">Built for real data work</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f) => (
              <div key={f.label} className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
                <p className="text-sm font-semibold text-white mb-1">{f.label}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800 py-20 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Ready to collect real data?</h2>
          <p className="text-slate-400 mb-8">Create an account and run your first workflow in under a minute.</p>
          <Link
            to="/register"
            className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-lg font-semibold text-base transition-colors duration-150"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Logo size={18} />
            ScoutFlow · AI Data Intelligence
          </div>
          <p className="text-xs text-slate-600">Built with Node.js, Python FastAPI, Groq, Neon PostgreSQL, React</p>
        </div>
      </footer>
    </div>
  );
}
