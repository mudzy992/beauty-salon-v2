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

/**
 * Stabilni kod greske koji backend vraca uz poruku (`apiError(KOD)` u
 * `backend/src/common/errors/api-error-codes.ts`, proslijedjen kroz
 * `HttpExceptionFilter`). `undefined` za stariji backend ili greske bez koda.
 */
export const getErrorCode = (err: unknown): string | undefined => {
  const code = (err as { response?: { data?: { code?: unknown } } })?.response?.data?.code
  return typeof code === 'string' && code ? code : undefined
}
