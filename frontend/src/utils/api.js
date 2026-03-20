import axios from "axios";
import { getToken, getRefreshToken, saveAuth, clearAuth } from "./auth.js";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Attempt silent token refresh on 401
let isRefreshing = false;
let refreshQueue = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        saveAuth({ accessToken: data.accessToken, refreshToken: data.refreshToken }, true);

        refreshQueue.forEach(({ resolve }) => resolve(data.accessToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        clearAuth();
        refreshQueue.forEach(({ reject }) => reject(error));
        refreshQueue = [];
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data) => api.post("/api/auth/register", data),
  login: (data) => api.post("/api/auth/login", data),
  logout: () => api.post("/api/auth/logout"),
  profile: () => api.get("/api/auth/profile"),
  updateProfile: (data) => api.patch("/api/auth/profile", data)
};

// Opportunities
export const opportunitiesApi = {
  search: (params) => api.post("/api/opportunities/search", params),
  getSaved: () => api.get("/api/opportunities"),
  save: (opportunity) => api.post("/api/opportunities/save", { opportunity }),
  analyze: (formData) =>
    api.post("/api/opportunities/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    }),
  analyzeText: (text) =>
    api.post("/api/opportunities/analyze", { text }, {
      headers: { "Content-Type": "application/json" }
    })
};

// Email
export const emailApi = {
  getPreferences: () => api.get("/api/email-preferences/preferences"),
  updatePreferences: (data) => api.post("/api/email-preferences/preferences/update", data),
  sendDailyDigest: () => api.post("/api/email/send-daily-digest")
};

// Opportunity Intelligence (Python FastAPI service)
const INTELLIGENCE_BASE = import.meta.env.VITE_INTELLIGENCE_URL || "";

export const intelligenceApi = {
  get: () =>
    axios.get(`${INTELLIGENCE_BASE}/opportunity-intelligence`),
  refresh: () =>
    axios.post(`${INTELLIGENCE_BASE}/opportunity-intelligence/refresh`)
};

// ERP Connectors
export const erpApi = {
  list: () => api.get("/api/erp"),
  create: (data) => api.post("/api/erp", data),
  remove: (id) => api.delete(`/api/erp/${id}`),
  test: (id) => api.post(`/api/erp/${id}/test`),
  getPurchaseOrders: (id, params) => api.get(`/api/erp/${id}/purchase-orders`, { params }),
  getSuppliers: (id, params) => api.get(`/api/erp/${id}/suppliers`, { params }),
  getInvoices: (id, params) => api.get(`/api/erp/${id}/invoices`, { params })
};

// Workflows
export const workflowsApi = {
  list: (params) => api.get("/api/workflows", { params }),
  create: (data) => api.post("/api/workflows", data),
  get: (id) => api.get(`/api/workflows/${id}`),
  update: (id, data) => api.patch(`/api/workflows/${id}`, data),
  remove: (id) => api.delete(`/api/workflows/${id}`),
  addTask: (id, data) => api.post(`/api/workflows/${id}/tasks`, data),
  updateTask: (id, taskId, data) => api.patch(`/api/workflows/${id}/tasks/${taskId}`, data),
  addComment: (id, taskId, data) => api.post(`/api/workflows/${id}/tasks/${taskId}/comments`, data)
};

// Role Dashboards
export const dashboardApi = {
  capture: () => api.get("/api/dashboard/capture"),
  procurement: () => api.get("/api/dashboard/procurement"),
  ops: () => api.get("/api/dashboard/ops"),
  exec: () => api.get("/api/dashboard/exec")
};

// Suppliers
export const suppliersApi = {
  list: (params) => api.get("/api/suppliers", { params }),
  create: (data) => api.post("/api/suppliers", data),
  get: (id) => api.get(`/api/suppliers/${id}`),
  update: (id, data) => api.patch(`/api/suppliers/${id}`, data),
  remove: (id) => api.delete(`/api/suppliers/${id}`),
  scoreboard: () => api.get("/api/suppliers/summary/scoreboard")
};

// Margin Leakage Analytics
export const marginsApi = {
  summary: () => api.get("/api/margins/summary"),
  supplierRisk: () => api.get("/api/margins/supplier-risk"),
  agencyTrends: () => api.get("/api/margins/agency-trends")
};

// Capacity & Load Balancing
export const capacityApi = {
  overview: () => api.get("/api/capacity/overview"),
  forecast: () => api.get("/api/capacity/forecast")
};

export default api;
