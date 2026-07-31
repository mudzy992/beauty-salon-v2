import type { ReactNode } from 'react'
import { AlertCircle, Inbox, RotateCcw } from 'lucide-react'

import { Button } from '../../../components/ui/button'

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Učitavanje podataka">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-9 flex-1 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ))}
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
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
      <Inbox className="h-8 w-8 text-slate-400" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({
  title = 'Došlo je do greške',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-6 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/30"
    >
      <AlertCircle className="h-8 w-8 text-rose-500" aria-hidden="true" />
      <p className="text-sm font-medium text-rose-900 dark:text-rose-200">{title}</p>
      {description ? (
        <p className="max-w-sm text-xs text-rose-700 dark:text-rose-300">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RotateCcw className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          Pokušaj ponovo
        </Button>
      ) : null}
    </div>
  )
}
