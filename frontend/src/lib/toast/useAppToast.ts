import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { getErrorMessage } from '../../api/error'
import { resolveApiErrorDescription } from './api-error-description.mjs'

/**
 * Naslov je uvijek preveden (prosljeđuje ga pozivatelj). **Opis** je bio sirova
 * serverska poruka — a serverske poruke su bosanske, pa bi ih EN korisnik dobio
 * neprevedene (WCAG 3.1.2, Language of Parts). Izmjereno 2026-11-10: 37 poziva.
 *
 * Sada opis prolazi kroz `resolveApiErrorDescription` (čist modul, bez Reacta, pa je
 * ponašanje testirano u `api-error-description.test.mjs`): prevedeno kad je poruka
 * mapirana, sirovo samo na bosanskom, izostavljeno na engleskom.
 */
export const useAppToast = () => {
  const { t, i18n } = useTranslation()

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
    (err: unknown, fallback = t('common.error')) => {
      const description = resolveApiErrorDescription(getErrorMessage(err, ''), i18n.language, t)
      toast.error(fallback, description ? { description } : undefined)
    },
    [t, i18n.language],
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
