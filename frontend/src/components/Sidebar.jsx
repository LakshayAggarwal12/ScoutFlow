import { NavLink, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";
import {
  IconClock,
  IconClose,
  IconDashboard,
  IconDatabase,
  IconInfo,
  IconLogOut,
  IconMoon,
  IconSparkles,
  IconSun,
  IconTasks,
} from "./icons.jsx";

// Same five destinations, same order as before - grouped for scanability.
const NAV_GROUPS = [
  {
    label: "Workspace",
    links: [
      { to: "/dashboard", label: "Dashboard", icon: IconDashboard, end: true },
      { to: "/create", label: "Create Task", icon: IconSparkles },
      { to: "/tasks", label: "Tasks", icon: IconTasks },
    ],
  },
  {
    label: "Data",
    links: [
      { to: "/sources", label: "Sources", icon: IconDatabase },
      { to: "/history", label: "History", icon: IconClock },
    ],
  },
];

function initialsFor(user) {
  const source = user?.name?.trim() || user?.email || "";
  if (!source) return "SF";
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile scrim */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200
          dark:border-slate-800 dark:bg-slate-900
          lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:translate-x-0
          ${mobileOpen ? "translate-x-0 shadow-pop" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={onClose}>
            <Logo size={30} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-none tracking-tight text-ink dark:text-white">
                ScoutFlow
              </span>
              <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">AI Data Intelligence</span>
            </span>
          </Link>
          <button type="button" onClick={onClose} className="btn-icon-sm lg:hidden" aria-label="Close navigation">
            <IconClose size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5 last:mb-0">
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? "bg-ink text-white shadow-sm dark:bg-white dark:text-ink"
                          : "text-slate-600 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={17} className={isActive ? "shrink-0" : "shrink-0 text-slate-400 dark:text-slate-500"} />
                        <span className="truncate">{label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        {/* Footer: theme, demo notice, account */}
        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white"
          >
            {theme === "dark" ? (
              <IconSun size={17} className="text-slate-400" />
            ) : (
              <IconMoon size={17} className="text-slate-400" />
            )}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          <div className="mx-3 my-2.5 flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
            <IconInfo size={13} className="mt-0.5 shrink-0" />
            <span>Demo mode uses seeded listings when a real source can&apos;t be reached.</span>
          </div>

          {user && (
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {initialsFor(user)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink dark:text-slate-100">{user.name || "User"}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
                className="btn-icon-sm hover:text-red-600 dark:hover:text-red-400"
              >
                <IconLogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

