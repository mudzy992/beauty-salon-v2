import { useTranslation } from 'react-i18next'

export const RouteLoadingFallback = () => {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
      className="flex min-h-[40vh] items-center justify-center px-4 py-12 text-sm text-slate-600"
    >
      {t('common.loading')}
    </div>
  )
}
