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

export default api;
