import api from './client'

export const http = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<T>(url, params ? { params } : undefined).then((r) => r.data),
  post: <T>(url: string, data?: unknown) =>
    api.post<T>(url, data).then((r) => r.data),
  patch: <T>(url: string, data?: unknown) =>
    api.patch<T>(url, data).then((r) => r.data),
  del: <T>(url: string, data?: unknown) =>
    api.delete<T>(url, data ? { data } : undefined).then((r) => r.data),
}

