import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("scoutflow_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Since exports are standard links, appending token via URL is needed, or the browser won't send it.
// Easiest is just allowing export URLs if the user has the link, or appending token to URL.
// But for now, we'll append token as query param so backend can verify if we want to secure exports.
const getTokenParam = () => {
  const t = localStorage.getItem("scoutflow_token");
  return t ? `?token=${encodeURIComponent(t)}` : "";
};


export const createTask = (prompt) => api.post("/tasks", { prompt }).then((r) => r.data);
export const listTasks = (params) => api.get("/tasks", { params }).then((r) => r.data);
export const getTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const runTask = (id) => api.post(`/tasks/${id}/run`).then((r) => r.data);
export const cancelTask = (id) => api.post(`/tasks/${id}/cancel`).then((r) => r.data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then((r) => r.data);
export const getWorkflow = (id, version) => api.get(`/tasks/${id}/workflow`, { params: { version } }).then((r) => r.data);
export const getWorkflowVersions = (id) => api.get(`/tasks/${id}/workflow/versions`).then((r) => r.data);
export const getLogs = (id) => api.get(`/tasks/${id}/logs`).then((r) => r.data);
export const getDataset = (id, version) => api.get(`/tasks/${id}/dataset`, { params: { version } }).then((r) => r.data);
export const getDatasetVersions = (id) => api.get(`/tasks/${id}/dataset/versions`).then((r) => r.data);
export const getRecords = (id, params) => api.get(`/tasks/${id}/records`, { params }).then((r) => r.data);
export const exportCsvUrl = (id) => `${API_URL}/tasks/${id}/export/csv${getTokenParam()}`;
export const exportJsonUrl = (id) => `${API_URL}/tasks/${id}/export/json${getTokenParam()}`;
export const exportXlsxUrl = (id) => `${API_URL}/tasks/${id}/export/xlsx${getTokenParam()}`;
export const getStats = () => api.get("/stats").then((r) => r.data);
export const getSource = (id) => api.get(`/sources/${id}`).then((r) => r.data);
export const listSources = (params) => api.get("/sources", { params }).then((r) => r.data);
export const getSourceHealth = (taskId) => api.get(`/sources/health/${taskId}`).then((r) => r.data);
