import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

export const createTask = (prompt) => api.post("/tasks", { prompt }).then((r) => r.data);
export const listTasks = (params) => api.get("/tasks", { params }).then((r) => r.data);
export const getTask = (id) => api.get(`/tasks/${id}`).then((r) => r.data);
export const runTask = (id) => api.post(`/tasks/${id}/run`).then((r) => r.data);
export const cancelTask = (id) => api.post(`/tasks/${id}/cancel`).then((r) => r.data);
export const getWorkflow = (id) => api.get(`/tasks/${id}/workflow`).then((r) => r.data);
export const getLogs = (id) => api.get(`/tasks/${id}/logs`).then((r) => r.data);
export const getDataset = (id, version) => api.get(`/tasks/${id}/dataset`, { params: { version } }).then((r) => r.data);
export const getDatasetVersions = (id) => api.get(`/tasks/${id}/dataset/versions`).then((r) => r.data);
export const getRecords = (id, params) => api.get(`/tasks/${id}/records`, { params }).then((r) => r.data);
export const exportCsvUrl = (id) => `${API_URL}/tasks/${id}/export/csv`;
export const exportJsonUrl = (id) => `${API_URL}/tasks/${id}/export/json`;
export const getStats = () => api.get("/stats").then((r) => r.data);
export const getSource = (id) => api.get(`/sources/${id}`).then((r) => r.data);
export const listSources = (params) => api.get("/sources", { params }).then((r) => r.data);
export const getSourceHealth = (taskId) => api.get(`/sources/health/${taskId}`).then((r) => r.data);
