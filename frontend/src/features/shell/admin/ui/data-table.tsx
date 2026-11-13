import { useEffect, useRef, type ReactNode } from 'react'
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
  /** Klase po redu — npr. `opacity-60` za neradne dane ili border između redova. */
  rowClassName?: (row: T) => string | undefined
  /** Dodatne klase na `<table>`, kad stranica već ima ustaljen izgled (npr. `border-collapse`). */
  tableClassName?: string
  /**
   * Prikazati `ArrowUpDown` na NESORTIRANIM kolonama (default). Postojeće tabele u repo-u
   * crtaju strelicu samo na sortiranoj koloni, pa im `false` čuva izgled.
   */
  unsortedIndicator?: boolean
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

const SortIndicator = ({
  direction,
  unsorted = true,
}: {
  direction: 'asc' | 'desc' | null
  unsorted?: boolean
}) => {
  if (direction === 'asc') return <ArrowUp aria-hidden className="h-3.5 w-3.5" />
  if (direction === 'desc') return <ArrowDown aria-hidden className="h-3.5 w-3.5" />
  if (!unsorted) return null
  return <ArrowUpDown aria-hidden className="h-3.5 w-3.5 opacity-50" />
}

/**
 * Tabela s ugrađenom pristupačnošću.
 *
 * WCAG 1.3.1 — `<caption>` daje ime, `scope="col"` povezuje zaglavlja s ćelijama, a prazno
 * stanje je `<td colSpan>` u `<tfoot>` da zaglavlja nikad ne ostanu bez podatkovne ćelije.
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
  rowClassName,
  tableClassName,
  unsortedIndicator = true,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const scrollRegion = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const region = scrollRegion.current
    if (!region) return
    // Focus is needed only while horizontal scrolling is possible (including after resize).
    const update = () => {
      if (region.scrollWidth > region.clientWidth) region.tabIndex = 0
      else region.removeAttribute('tabindex')
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(region)
    if (region.firstElementChild) observer.observe(region.firstElementChild)
    return () => observer.disconnect()
  }, [loading, error, rows])

  if (loading) return <TableSkeleton columns={columns.length} />
  if (error) return <ErrorState description={typeof error === 'string' ? error : undefined} />

  return (
    <div ref={scrollRegion} role="region" aria-label={caption} className={cn('overflow-x-auto', className)}>
      <table className={cn('app-table data-table w-full', tableClassName)}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          {/* IZMJERENO 2026-11-09 nad izvornim `<thead><tr>` klasama svih 8 dashboard
              tabela: `text-xs uppercase text-slate-500` ima 5 (Loyalty, Salon x2,
              Services, Users), nema 3 (expense, income, Notifications). Uzglavlje je
              dominantni obrazac, pa je ovdje default — vlasnik je potvrdio da je
              konzistentnost na dashboardima obavezna, pa se lokalne varijante ne čuvaju. */}
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
            {columns.map((column) => {
              // `sort` je opciono. Prijašnje `sort?.key === column.sortKey` dalo bi
              // `undefined === undefined` → true za kolonu bez `sortKey`, pa bi
              // `sort!.direction` palo s TypeError. Zato se prvo provjeri da `sort`
              // postoji, i `sort!` se više ne koristi nigdje.
              const direction =
                sort && column.sortKey && sort.key === column.sortKey ? sort.direction : null
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    !column.sortKey ? undefined : direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'
                  }
                  /* `font-medium` i `text-slate-500` na <th> NE trebaju ovdje: garantuje ih
                     `src/index.css` → `table.app-table th { @apply font-medium text-slate-500; }`
                     sa specifičnošću (0,1,2), koja pobjeđuje svaku utility klasu (0,1,0).
                     Dodati ih ovdje bilo bi suvišno — asertovano u data-table-consistency. */
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
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cn('border-b border-slate-100 dark:border-slate-800/80', rowClassName?.(row))}
            >
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
        {rows.length === 0 ? (
          /* WCAG 1.3.1 — `th-has-data-cells`. Prazan `<tbody>` ostavlja `<th>` bez ijedne
             podatkovne ćelije, pa axe javlja nepotpun nalaz: run 42989950774, dvije tabele
             na `/admin`, „Table data cells are missing or empty". Poruka o praznom stanju
             zato ide U tabelu kao ćelija preko svih kolona — čitač ekrana je čita u
             kontekstu tabele, a ne kao tekst koji lebdi ispod nje.
             `<tfoot>`, ne `<tbody>`: card prikaz ispod 640px (`src/index.css:38-44`)
             pretvara `tbody td` u flex red s `content: attr(data-label)`, pa bi poruka
             tamo dobila praznu pseudolabelu i raspored koji joj ne pripada. */
          <tfoot>
            <tr>
              <td colSpan={columns.length} className="border-0">
                {empty ?? <EmptyState title={t('table.noResults')} />}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}
