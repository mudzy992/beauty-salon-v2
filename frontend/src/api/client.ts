import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: baseURL ? `${baseURL.replace(/\/$/, '')}` : '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token ?? localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
  }
  return config;
});

const isExpectedUnauthorizedOnAuth = (requestUrl: string): boolean => {
  const u = requestUrl.replace(/^https?:\/\/[^/]+/i, '');
  return (
    u.includes('/auth/login') ||
    u.includes('/auth/register') ||
    u.includes('/auth/forgot-password') ||
    u.includes('/auth/reset-password')
  );
};

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const url = String(err.config?.url ?? '');
      const base = String(err.config?.baseURL ?? '');
      const combined = `${base}${url}`;
      if (isExpectedUnauthorizedOnAuth(url) || isExpectedUnauthorizedOnAuth(combined)) {
        return Promise.reject(err);
      }
      useAuthStore.getState().logout();
      window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);

export default api;
