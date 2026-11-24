import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'

type Props = {
  page: number
  pageSize: number
  total: number
  setPage: Dispatch<SetStateAction<number>>
  headingRef: RefObject<HTMLHeadingElement>
}

export function StylistPagination({ page, pageSize, total, setPage, headingRef }: Props) {
  const { t } = useTranslation()
  const changePage = (direction: -1 | 1) => {
    // The pagination unmounts while loading; move focus before its trigger disappears.
    headingRef.current?.focus()
    setPage(previous => direction === -1 ? Math.max(0, previous - 1) : previous + 1)
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-content-strong">{t('stylists.table.total', { count: total })}</p>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => changePage(-1)}>
          {t('common.previous')}
        </Button>
        <p className="text-sm text-content-strong ">
          {page + 1} / {Math.max(1, Math.ceil(total / pageSize))}
        </p>
        <Button type="button" size="sm" variant="outline" disabled={page >= Math.ceil(total / pageSize) - 1} onClick={() => changePage(1)}>
          {t('common.next')}
        </Button>
      </div>
    </div>
  )
}
