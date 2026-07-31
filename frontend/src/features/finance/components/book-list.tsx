import { Button } from '../../../components/ui/button'
import { BookLockBadge } from './book-lock-controls'
import { EmptyState, TableSkeleton } from './data-state'
import { formatMoney, formatPeriod } from '../finance.utils'

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
  if (isLoading) return <TableSkeleton rows={4} columns={4} />
  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Knjige se otvaraju automatski prvog dana u mjesecu."
      />
    )
  }

  return (
    <ul className="grid gap-2">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-50">
                {formatPeriod(row.year, row.month)}
              </span>
              <BookLockBadge isLocked={row.isLocked} />
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {primaryLabel}: {formatMoney(row.primaryAmount)}
              {secondaryLabel !== undefined && row.secondaryAmount !== undefined
                ? ` · ${secondaryLabel}: ${formatMoney(row.secondaryAmount)}`
                : ''}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpen(row.id)}
            aria-label={`Otvori knjigu ${formatPeriod(row.year, row.month)}`}
          >
            Otvori
          </Button>
        </li>
      ))}
    </ul>
  )
}
