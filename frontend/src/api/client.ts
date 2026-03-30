import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: baseURL ? `${baseURL.replace(/\/$/, '')}` : '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
