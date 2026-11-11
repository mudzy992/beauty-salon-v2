import type { ReactNode } from 'react'
import { AlertCircle, Inbox, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../components/ui/button'

/** NEJRA §11 — rezervisana visina bez layout shift-a; `role="status"`. */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite" className="space-y-2">
      <span className="sr-only">{t('finance.states.loading')}</span>
      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-3">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-9 flex-1 animate-pulse rounded-md bg-surface-muted" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Prazno stanje uvijek nudi sljedeći korak (`action`). */
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
    <div
      data-aurum-card
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-control-border bg-surface px-6 py-10 text-center"
    >
      <Inbox className="h-8 w-8 text-content-muted" aria-hidden="true" />
      <p className="aurum-heading text-sm font-medium text-content">{title}</p>
      {description ? <p className="max-w-sm text-xs text-content-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/** `role="alert"` + retry; boja greške nikad nije jedini nosilac informacije. */
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
      data-aurum-card
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-danger bg-surface px-6 py-10 text-center"
    >
      <AlertCircle className="h-8 w-8 text-danger" aria-hidden="true" />
      <p className="aurum-heading text-sm font-medium text-content">
        {title ?? t('finance.states.errorTitle')}
      </p>
      {description ? <p className="max-w-sm text-xs text-content-muted">{description}</p> : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.states.retry')}
        </Button>
      ) : null}
    </div>
  )
}
