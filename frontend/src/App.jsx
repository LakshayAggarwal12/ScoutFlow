import { Routes, Route } from "react-router-dom";
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
