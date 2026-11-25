import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Loader2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { EmptyState, ErrorState } from '../shell/admin/ui/data-state'
import { useStylistPicker } from './use-stylist-picker'

const displayName = (stylist: {
  user?: { firstName: string | null; lastName: string | null; username: string } | null
}) => {
  const user = stylist.user
  if (!user) return '—'
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username
}

/**
 * Izbor stilista za analitički tab „Stilisti“.
 *
 * Bez `?stylistId=` tab je prije prikazivao samo poruku „odaberite stilistu“ i
 * link nazad na upravljanje stilistima — mrtva granica. Sada tab sam bira
 * stilista i otvara njegovu analitiku.
 */
export function StylistPicker() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { items, page, setPage, total, totalPages, hasMore, loading, loadError, reload } = useStylistPicker()

  const hrefFor = (stylistId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'stylists')
    next.set('stylistId', stylistId)
    next.delete('fromDate')
    next.delete('toDate')
    return `/admin/analytics?${next.toString()}`
  }

  return (
    <Card className="overflow-hidden" data-stylist-picker>
      {loading ? (
        <div role="status" className="flex justify-center p-10 text-content-strong">
          <span className="sr-only">{t('common.loading')}</span>
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      ) : loadError ? (
        <div className="p-4">
          <ErrorState description={t('stylistAnalytics.picker.loadFailed')} onRetry={reload} />
        </div>
      ) : items.length === 0 ? (
        <div className="p-4">
          <EmptyState title={t('stylistAnalytics.picker.empty')} />
        </div>
      ) : (
        <ul className="divide-y divide-line" data-stylist-picker-list>
          {items.map((stylist) => (
            <li key={stylist.id}>
              <Link
                to={hrefFor(stylist.id)}
                className="flex min-h-target items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-content">{displayName(stylist)}</span>
                  <span className="block truncate text-sm text-content-strong">
                    {stylist.user?.email ?? stylist.specialization ?? '—'}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {stylist.isActive === false ? (
                    <Badge variant="danger" className="text-[10px]">
                      {t('stylistAnalytics.picker.inactive')}
                    </Badge>
                  ) : null}
                  <ChevronRight className="h-4 w-4 text-content-strong" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !loadError && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-content-strong">
            {t('stylistAnalytics.picker.total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage(Math.max(0, page - 1))}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-content-strong">
              {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!hasMore && page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
