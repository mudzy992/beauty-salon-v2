import axios from 'axios';
import { synchronizeAuthFromStorage, useAuthStore } from '../stores/auth.store';

const baseURL = import.meta.env.VITE_API_URL || '';

const resolvedBaseURL = baseURL ? `${baseURL.replace(/\/$/, '')}` : '';
export const api = axios.create({
  baseURL: resolvedBaseURL,
  headers: { 'Content-Type': 'application/json' },
});

// Login's optional profile fetch must use the just-issued token, without
// attaching or invalidating an unrelated currently active session.
export const loginProfileApi = axios.create({ baseURL: resolvedBaseURL });

const requestSessionVersions = new WeakMap<object, number>();

api.interceptors.request.use((config) => {
  // Do not send an action initiated in the old tab session with a new user's
  // token when the storage event has not yet been delivered.
  if (synchronizeAuthFromStorage()) throw new axios.CanceledError('Session changed before request');
  const session = useAuthStore.getState();
  requestSessionVersions.set(config, session.sessionVersion);
  const token = session.token ?? localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Content-Type')
    } else {
      delete config.headers['Content-Type']
    }
  }
  return config;
}, (error) => { throw error }, { synchronous: true });

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
  (r) => { synchronizeAuthFromStorage(); return r },
  (err) => {
    synchronizeAuthFromStorage();
    if (err.response?.status === 401) {
      const url = String(err.config?.url ?? '');
      const base = String(err.config?.baseURL ?? '');
      const combined = `${base}${url}`;
      if (isExpectedUnauthorizedOnAuth(url) || isExpectedUnauthorizedOnAuth(combined)) {
        return Promise.reject(err);
      }
      const session = useAuthStore.getState();
      if (session.token && err.config && requestSessionVersions.get(err.config) === session.sessionVersion) {
        if (session.logout()) window.location.assign('/login');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
