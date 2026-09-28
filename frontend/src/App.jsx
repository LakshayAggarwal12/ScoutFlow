import { useState } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Logo from "./components/Logo.jsx";
import { IconMenu, IconMoon, IconSun } from "./components/icons.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateTask from "./pages/CreateTask.jsx";
import TaskList from "./pages/TaskList.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import Workflow from "./pages/Workflow.jsx";
import Dataset from "./pages/Dataset.jsx";
import Sources from "./pages/Sources.jsx";
import History from "./pages/History.jsx";

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Compact bar shown below the lg breakpoint, where the sidebar becomes a drawer.
function MobileTopbar({ onOpenNav }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-3 py-2.5 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-925/85">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onOpenNav} className="btn-icon" aria-label="Open navigation">
          <IconMenu size={18} />
        </button>
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
          <Logo size={24} />
          <span className="truncate text-sm font-semibold tracking-tight text-ink dark:text-white">ScoutFlow</span>
        </Link>
      </div>
      <button type="button" onClick={toggleTheme} className="btn-icon" aria-label="Toggle dark mode">
        {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
      </button>
    </header>
  );
}

function AppShell({ children }) {
  // Each route renders its own AppShell, so navigating remounts it and resets
  // the drawer to closed. Sidebar links additionally close it via onClose.
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar onOpenNav={() => setNavOpen(true)} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}


export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* Protected app routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell><Dashboard /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create"
        element={
          <ProtectedRoute>
            <AppShell><CreateTask /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <AppShell><TaskList /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <ProtectedRoute>
            <AppShell><TaskDetail /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id/workflow"
        element={
          <ProtectedRoute>
            <AppShell><Workflow /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id/dataset"
        element={
          <ProtectedRoute>
            <AppShell><Dataset /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sources"
        element={
          <ProtectedRoute>
            <AppShell><Sources /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AppShell><History /></AppShell>
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
}
