import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight, Loader2, Search } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { EmptyState, ErrorState } from '../shell/admin/ui/data-state'
import { useClientPicker } from './use-client-picker'

const displayName = (client: { firstName: string | null; lastName: string | null; username: string }) =>
  [client.firstName, client.lastName].filter(Boolean).join(' ') || client.username

/**
 * Izbor klijenta za analitički tab „Klijenti“.
 *
 * Tab mora biti samodovoljan: prije je bez `?userId=` redirectovao na
 * `/admin/users`, pa je stavka „Klijenti“ u bočnoj traci otvarala listu
 * korisnika umjesto analitike. Sada tab prikazuje listu klijenata i izbor
 * otvara analitiku tog klijenta.
 */
export function ClientPicker() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { items, search, setSearch, page, setPage, total, totalPages, loading, loadError, reload } =
    useClientPicker()

  const hrefFor = (userId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'clients')
    next.set('userId', userId)
    next.delete('fromDate')
    next.delete('toDate')
    return `/admin/analytics?${next.toString()}`
  }

  return (
    <Card className="overflow-hidden" data-client-picker>
      <div className="p-4">
        <div className="relative w-full max-w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-strong" aria-hidden="true" />
          <Input
            className="pl-9"
            aria-label={t('clientAnalyticsPage.picker.search')}
            placeholder={t('clientAnalyticsPage.picker.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div role="status" className="flex justify-center p-10 text-content-strong">
          <span className="sr-only">{t('common.loading')}</span>
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      ) : loadError ? (
        <div className="p-4">
          <ErrorState description={t('clientAnalyticsPage.picker.loadFailed')} onRetry={reload} />
        </div>
      ) : items.length === 0 ? (
        <div className="p-4">
          <EmptyState title={t('clientAnalyticsPage.picker.empty')} />
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line" data-client-picker-list>
          {items.map((client) => (
            <li key={client.id}>
              <Link
                to={hrefFor(client.id)}
                className="flex min-h-target items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-content">{displayName(client)}</span>
                  <span className="block truncate text-sm text-content-strong">
                    {client.email ?? `@${client.username}`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-content-strong" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!loading && !loadError && total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-4">
          <p className="text-sm text-content-strong">
            {t('clientAnalyticsPage.picker.total', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage(Math.max(0, page - 1))}>
              {t('common.previous')}
            </Button>
            <span className="text-sm text-content-strong">
              {page + 1} / {totalPages}
            </span>
            <Button type="button" size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
              {t('common.next')}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
