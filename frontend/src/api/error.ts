import type { AxiosError } from 'axios'

export const getErrorMessage = (err: unknown, fallback = 'Greška'): string => {
  const axiosErr = err as AxiosError<{ message?: unknown }>
  const message = axiosErr?.response?.data?.message
  if (typeof message === 'string' && message.trim().length > 0) return message
  if (Array.isArray(message)) {
    const first = message.find((x) => typeof x === 'string' && x.trim().length > 0)
    if (typeof first === 'string') return first
  }
  if (axiosErr?.message && typeof axiosErr.message === 'string') return axiosErr.message
  return fallback
}

