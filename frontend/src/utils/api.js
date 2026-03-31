import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
  getTimeline: () => api.get('/dashboard/timeline'),
  getThreatDistribution: () => api.get('/dashboard/threat-distribution'),
  getTopIPs: () => api.get('/dashboard/top-ips'),
  health: () => api.get('/dashboard/health'),
};

export const logsAPI = {
  getLogs: (params = {}) => api.get('/logs/', { params }),
  getStats: () => api.get('/logs/stats'),
  ingest: (log, use_ml = false) => api.post('/logs/ingest', { log, use_ml }),
  ingestBatch: (logs, use_ml = false) => api.post('/logs/ingest/batch', { logs, use_ml }),
  simulate: (count = 20) => api.post('/logs/simulate', { count }),
};

export const alertsAPI = {
  getAlerts: (params = {}) => api.get('/alerts/', { params }),
  getStats: () => api.get('/alerts/stats'),
  acknowledge: (id) => api.post(`/alerts/${id}/acknowledge`),
  resolve: (id) => api.post(`/alerts/${id}/resolve`),
};

export const analysisAPI = {
  classify: (message) => api.post('/analysis/classify', { message }),
  getModelStatus: () => api.get('/analysis/model/status'),
  train: (model_type = 'random_forest', n_samples = 1000) =>
    api.post('/analysis/train', { model_type, n_samples }),
  getTemplates: () => api.get('/analysis/templates'),
};

export default api;
