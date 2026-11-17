import type { ReactNode } from 'react'
import { AlertCircle, Inbox, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../components/ui/button'

export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite" data-admin-state="loading" className="space-y-2">
      <span className="sr-only">{t('finance.states.loading')}</span>
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                data-admin-skeleton-cell
                className="h-9 flex-1 animate-pulse rounded-md motion-reduce:animate-none bg-surface-muted"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div data-admin-state="empty" className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <Inbox className="h-8 w-8 text-content-muted" aria-hidden="true" />
      <p className="text-sm font-medium text-content">
        {title}
      </p>
      {description ? (
        <p className="max-w-sm text-xs text-content-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role="alert"
      data-admin-state="error"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-6 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/30"
    >
      <AlertCircle className="h-8 w-8 text-rose-500" aria-hidden="true" />
      <p className="text-sm font-medium text-rose-900 dark:text-rose-200">
        {title ?? t('finance.states.errorTitle')}
      </p>
      {description ? (
        <p className="max-w-sm text-xs text-rose-700 dark:text-rose-300">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.states.retry')}
        </Button>
      ) : null}
    </div>
  )
}
