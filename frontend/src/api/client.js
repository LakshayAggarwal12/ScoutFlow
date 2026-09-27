import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

// Attach the JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sf_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the server returns 401, clear stored session so the UI redirects to login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sf_token");
      localStorage.removeItem("sf_user");
    }
    return Promise.reject(err);
  }
);

const getTokenParam = () => {
  const t = localStorage.getItem("sf_token");
  return t ? `?token=${encodeURIComponent(t)}` : "";
};

// Auth
export const registerUser = (name, email, password) => api.post("/auth/register", { name, email, password }).then((r) => r.data);
export const loginUser = (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data);
export const getMe = () => api.get("/auth/me").then((r) => r.data);

// Tasks
export const createTask = (prompt) => api.post("/tasks", { prompt }).then((r) => r.data);
export const listTasks = (params) => api.get("/tasks", { params }).then((r) => r.data);
export const getTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const runTask = (id) => api.post(`/tasks/${id}/run`).then((r) => r.data);
export const cancelTask = (id) => api.post(`/tasks/${id}/cancel`).then((r) => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);

// Workflow
export const getWorkflow = (id, version) => api.get(`/tasks/${id}/workflow`, { params: { version } }).then((r) => r.data);
export const getWorkflowVersions = (id) => api.get(`/tasks/${id}/workflow/versions`).then((r) => r.data);

// Logs
export const getLogs = (id) => api.get(`/tasks/${id}/logs`).then((r) => r.data);

// Dataset
export const getDataset = (id, version) => api.get(`/tasks/${id}/dataset`, { params: { version } }).then((r) => r.data);
export const getDatasetVersions = (id) => api.get(`/tasks/${id}/dataset/versions`).then((r) => r.data);
export const getRecords = (id, params) => api.get(`/tasks/${id}/records`, { params }).then((r) => r.data);

// Export URLs (token appended as query param for browser download links)
export const exportCsvUrl = (id) => `${API_URL}/tasks/${id}/export/csv${getTokenParam()}`;
export const exportJsonUrl = (id) => `${API_URL}/tasks/${id}/export/json${getTokenParam()}`;
export const exportXlsxUrl = (id) => `${API_URL}/tasks/${id}/export/xlsx${getTokenParam()}`;

// Stats
export const getStats = () => api.get("/stats").then((r) => r.data);

// Sources
export const getSource = (id) => api.get(`/sources/${id}`).then((r) => r.data);
export const listSources = (params) => api.get("/sources", { params }).then((r) => r.data);
export const getSourceHealth = (taskId) => api.get(`/sources/health/${taskId}`).then((r) => r.data);
