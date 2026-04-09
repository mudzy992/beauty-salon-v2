import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '../../api/error'

export const useAppToast = () => {
  const success = useCallback(
    (title: string, description?: string) =>
      toast.success(title, description ? { description } : undefined),
    [],
  )

  const error = useCallback(
    (title: string, description?: string) =>
      toast.error(title, description ? { description } : undefined),
    [],
  )

  const warning = useCallback(
    (title: string, description?: string) =>
      toast.warning(title, description ? { description } : undefined),
    [],
  )

  const toastApiError = useCallback(
    (err: unknown, fallback = 'Greška') =>
      toast.error(fallback, { description: getErrorMessage(err, fallback) }),
    [],
  )

  return useMemo(
    () => ({
      success,
      error,
      warning,
      toastApiError,
    }),
    [success, error, warning, toastApiError],
  )
}

