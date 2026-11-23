import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'

type Props = {
  total: number
  page: number
  totalPages: number
  visiblePageNumbers: { pages: number[]; totalPages: number }
  setPage: Dispatch<SetStateAction<number>>
}
export function UsersPagination({ total, page, totalPages, visiblePageNumbers, setPage }: Props) {
  const { t } = useTranslation()
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-content-strong">{t('users.clientTotal', { count: total })}</p>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          {t('common.previous')}
        </Button>

        {visiblePageNumbers.pages[0] > 0 ? (
          <>
            <Button type="button" size="sm" variant="ghost" onClick={() => setPage(0)}>
              1
            </Button>
            {visiblePageNumbers.pages[0] > 1 ? <span className="text-sm text-content-strong">…</span> : null}
          </>
        ) : null}

        {visiblePageNumbers.pages.map((p) => (
          <Button
            key={p}
            type="button"
            size="sm"
            variant={p === page ? 'default' : 'ghost'}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => setPage(p)}
          >
            {p + 1}
          </Button>
        ))}

        {visiblePageNumbers.totalPages - 1 > visiblePageNumbers.pages[visiblePageNumbers.pages.length - 1] ? (
          <>
            {visiblePageNumbers.pages[visiblePageNumbers.pages.length - 1] < visiblePageNumbers.totalPages - 2 ? (
              <span className="text-sm text-content-strong">…</span>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={() => setPage(visiblePageNumbers.totalPages - 1)}>
              {visiblePageNumbers.totalPages}
            </Button>
          </>
        ) : null}

        <span className="text-sm text-content-strong ">
          {page + 1} / {totalPages}
        </span>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          {t('common.next')}
        </Button>
      </div>
      </div>
  )
}
