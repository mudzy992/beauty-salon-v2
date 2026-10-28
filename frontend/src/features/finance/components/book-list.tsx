import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

import { Button } from '../../../components/ui/button'
import { BookLockBadge } from './book-lock-controls'
import { EmptyState, TableSkeleton } from './data-state'
import { formatPeriod } from '../finance.utils'

export type BookListRow = {
  id: string
  year: number
  month: number
  isLocked: boolean
  primaryAmount: number
  secondaryAmount?: number
}

type BookListProps = {
  rows: BookListRow[]
  isLoading: boolean
  primaryLabel: string
  secondaryLabel?: string
  emptyTitle: string
  onOpen: (bookId: string) => void
}

export function BookList({
  rows,
  isLoading,
  primaryLabel,
  secondaryLabel,
  emptyTitle,
  onOpen,
}: BookListProps) {
  const { t, i18n } = useTranslation()
  if (isLoading) return <TableSkeleton rows={4} columns={4} />
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={t('finance.book.autoOpenHint')}
      />
    )
  }

  return (
    <ul className="grid gap-2">
      {rows.map((row) => {
        const period = formatPeriod(row.year, row.month, i18n.language)
        return (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 dark:text-slate-50">
                  {period}
                </span>
                <BookLockBadge isLocked={row.isLocked} />
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {primaryLabel}:{' '}
                {formatLocalizedAmount(row.primaryAmount, i18n.language)}
                {secondaryLabel !== undefined &&
                row.secondaryAmount !== undefined
                  ? ` · ${secondaryLabel}: ${formatLocalizedAmount(row.secondaryAmount, i18n.language)}`
                  : ''}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpen(row.id)}
              aria-label={t('finance.book.openPeriod', { period })}
            >
              {t('finance.book.openBook')}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
