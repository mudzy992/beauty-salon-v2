import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../../../lib/cn'
import { EmptyState, ErrorState, TableSkeleton } from './data-state'

export type DataTableColumn<T> = {
  key: string
  /** i18n ključ zaglavlja kolone — bez hardkodiranih stringova. */
  headerKey: string
  /** Ako je postavljeno, zaglavlje je dugme za sortiranje s `aria-sort`. */
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  className?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  /** Pristupačno ime tabele (WCAG 1.3.1). */
  caption: string
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sort?: { key: string; direction: 'asc' | 'desc' } | null
  onSortChange?: (sortKey: string) => void
  loading?: boolean
  error?: ReactNode
  empty?: ReactNode
  className?: string
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

const SortIndicator = ({ direction }: { direction: 'asc' | 'desc' | null }) => {
  if (direction === 'asc') return <ArrowUp aria-hidden className="h-3.5 w-3.5" />
  if (direction === 'desc') return <ArrowDown aria-hidden className="h-3.5 w-3.5" />
  return <ArrowUpDown aria-hidden className="h-3.5 w-3.5 opacity-50" />
}

/**
 * Tabela s ugrađenom pristupačnošću.
 *
 * WCAG 1.3.1 — `<caption>` daje ime, `scope="col"` povezuje zaglavlja s ćelijama.
 * WCAG 4.1.2 — sortirajuće zaglavlje nosi `aria-sort`, a dugme tekstualno ime.
 * WCAG 1.4.1 — smjer sortiranja nije samo strelica: `aria-sort` je programski.
 * Ispod 640px tabela prelazi u card prikaz (`.data-table` u globals.css), pri čemu
 * `data-label` na svakoj ćeliji čuva vezu s nazivom kolone.
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  sort,
  onSortChange,
  loading = false,
  error,
  empty,
  className,
}: DataTableProps<T>) {
  const { t } = useTranslation()

  if (loading) return <TableSkeleton columns={columns.length} />
  if (error) return <ErrorState description={typeof error === 'string' ? error : undefined} />

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="app-table data-table w-full">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.sortKey
              const direction = isSorted ? sort!.direction : null
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    !column.sortKey ? undefined : direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'
                  }
                  className={cn(alignClass[column.align ?? 'left'], column.className)}
                >
                  {column.sortKey && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.sortKey!)}
                      className="inline-flex min-h-target items-center gap-1 font-semibold hover:text-brand-rose-text"
                      aria-label={t('table.sortBy', { column: t(column.headerKey) })}
                    >
                      {t(column.headerKey)}
                      <SortIndicator direction={direction} />
                    </button>
                  ) : (
                    t(column.headerKey)
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={t(column.headerKey)}
                  className={cn(alignClass[column.align ?? 'left'], column.className)}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="mt-3">
          {empty ?? <EmptyState title={t('table.noResults')} />}
        </div>
      ) : null}
    </div>
  )
}
