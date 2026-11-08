import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../components/ui/button'
import { cn } from '../../../../lib/cn'

type TablePaginationProps = {
  /** 1-based broj trenutne stranice. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  className?: string
}

/**
 * Paginacija tabele.
 *
 * WCAG 2.4.1 — paginacija je imenovana `nav` landmarka, ne skup anonimnih dugmadi.
 * WCAG 4.1.2 — dugmad imaju tekstualno ime (`table.previous` / `table.next`),
 * strelice su dekorativne.
 * WCAG 4.1.3 — opseg rezultata je u `role="status"` regiji.
 */
export const TablePagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: TablePaginationProps) => {
  const { t } = useTranslation()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <nav
      aria-label={t('table.pagination')}
      className={cn(
        'mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3',
        className,
      )}
    >
      <p role="status" aria-live="polite" className="text-xs text-content-muted">
        {total === 0
          ? t('table.showingAll', { count: 0 })
          : t('table.showingRange', { from, to, total })}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-content-muted">
          {t('table.pageOf', { current: page, total: totalPages })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          aria-label={t('table.previous')}
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          <span className="sr-only">{t('table.previous')}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-label={t('table.next')}
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
          <span className="sr-only">{t('table.next')}</span>
        </Button>
      </div>
    </nav>
  )
}
