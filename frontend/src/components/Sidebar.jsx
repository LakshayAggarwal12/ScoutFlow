import { NavLink } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import Logo from "./Logo.jsx";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/create", label: "Create Task" },
  { to: "/tasks", label: "Tasks" },
  { to: "/sources", label: "Sources" },
  { to: "/history", label: "History" },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 min-h-screen flex flex-col transition-colors duration-200">
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Logo />
          <div>
            <p className="text-sm font-semibold tracking-tight leading-none">ScoutFlow</p>
            <p className="text-[11px] text-slate-400 mt-1">AI Data Intelligence</p>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150 text-sm w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-ink text-white dark:bg-white dark:text-ink"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
        Demo mode uses seeded listings when a real source can't be reached, and labels them clearly.
      </div>
    </aside>
  );
}
