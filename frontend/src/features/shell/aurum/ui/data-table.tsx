import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../../../lib/cn'
import { EmptyState, ErrorState, TableSkeleton } from './data-state'

export type DataTableColumn<T> = {
  key: string
  /** i18n ključ zaglavlja — bez hard-kodiranih stringova. */
  headerKey: string
  sortKey?: string
  align?: 'left' | 'right' | 'center'
  className?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  caption: string
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sort?: { key: string; direction: 'asc' | 'desc' } | null
  onSortChange?: (sortKey: string) => void
  rowClassName?: (row: T) => string | undefined
  tableClassName?: string
  unsortedIndicator?: boolean
  loading?: boolean
  error?: ReactNode
  empty?: ReactNode
  className?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

const SortIndicator = ({ direction, unsorted = true }: { direction: 'asc' | 'desc' | null; unsorted?: boolean }) => {
  if (direction === 'asc') return <ArrowUp aria-hidden className="h-3.5 w-3.5" />
  if (direction === 'desc') return <ArrowDown aria-hidden className="h-3.5 w-3.5" />
  if (!unsorted) return null
  return <ArrowUpDown aria-hidden className="h-3.5 w-3.5 opacity-50" />
}

/**
 * NEJRA §11 — DataTable za Aurum dizajn-sistem.
 *
 * WCAG 1.3.1: `<caption>`, `scope="col"`, `data-label` za card prikaz <640px
 * (`.data-table` u `index.css`). WCAG 4.1.2: `aria-sort` i tekstualno ime dugmeta.
 * WCAG 1.4.1: smjer sortiranja je programski, ne samo strelica.
 * Samo semantički tokeni — klasični i Aurum skin dijele isti markup.
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
  rowClassName,
  tableClassName,
  unsortedIndicator = true,
}: DataTableProps<T>) {
  const { t } = useTranslation()

  if (loading) return <TableSkeleton columns={columns.length} />
  if (error) return <ErrorState description={typeof error === 'string' ? error : undefined} />

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className={cn('app-table data-table w-full', tableClassName)}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase text-content-muted">
            {columns.map((column) => {
              const direction =
                sort && column.sortKey && sort.key === column.sortKey ? sort.direction : null
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : undefined
                  }
                  className={cn('px-2 py-2 font-medium', alignClass[column.align ?? 'left'], column.className)}
                >
                  {column.sortKey && onSortChange ? (
                    <button
                      type="button"
                      className="min-h-target inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      aria-label={t('table.sortBy', { column: t(column.headerKey) })}
                      onClick={() => onSortChange(column.sortKey!)}
                    >
                      {t(column.headerKey)}
                      <SortIndicator direction={direction} unsorted={unsortedIndicator} />
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
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {empty ?? <EmptyState title={t('common.noData')} />}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className={cn('border-b border-line', rowClassName?.(row))}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    data-label={t(column.headerKey)}
                    className={cn('px-2 py-2 text-sm text-content', alignClass[column.align ?? 'left'], column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
