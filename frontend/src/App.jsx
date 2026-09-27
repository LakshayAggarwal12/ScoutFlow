import { Routes, Route } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CreateTask from "./pages/CreateTask.jsx";
import TaskList from "./pages/TaskList.jsx";
import TaskDetail from "./pages/TaskDetail.jsx";
import Workflow from "./pages/Workflow.jsx";
import Dataset from "./pages/Dataset.jsx";
import Sources from "./pages/Sources.jsx";
import History from "./pages/History.jsx";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("scoutflow_token") || "");
  const [inputToken, setInputToken] = useState("");

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-925">
        <div className="card p-8 w-full max-w-sm">
          <h1 className="text-xl font-semibold text-center mb-6">ScoutFlow Login</h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              localStorage.setItem("scoutflow_token", inputToken);
              setToken(inputToken);
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="password"
              placeholder="Admin Token"
              className="input"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreateTask />} />
          <Route path="/tasks" element={<TaskList />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/tasks/:id/workflow" element={<Workflow />} />
          <Route path="/tasks/:id/dataset" element={<Dataset />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}
