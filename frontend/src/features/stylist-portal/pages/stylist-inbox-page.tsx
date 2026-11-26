import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { RejectReservationDialog } from '../components/reject-reservation-dialog'
import { InboxReservationCard } from '../components/inbox-reservation-card'
import { useStylistInboxReservations } from '../hooks/useStylistReservations'
import { useStylistInboxActions } from '../hooks/useStylistInboxActions'
import { getIntlLocale } from '../../../i18n/locale-utils.mjs'

/**
 * Inbox rezervacija (S10) — **tanka kompozicija**.
 *
 * Akcije su u `hooks/useStylistInboxActions.ts`, a kartica rezervacije je u
 * `components/inbox-reservation-card.tsx`.
 *
 * **FSM ostaje isti**: zaključavanje → otključavanje → prihvatanje → odbijanje,
 * sa istim uslovima i istim redoslijedom.
 */
export const StylistInboxPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()

  const { reservations, isLoading, isFetching, error, refetch, lock, unlock, accept, reject } =
    useStylistInboxReservations({ stylistProfileId: profileId })

  const actions = useStylistInboxActions({
    profileId: profileId ?? '',
    locale,
    lock,
    unlock,
    accept,
    reject,
  })

  const pending = useMemo(() => reservations, [reservations])

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div role="status" aria-live="polite" className="text-sm text-content-muted">
          {t('common.loading')}
        </div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-content font-semibold">{t('stylistPortal.inbox.noProfile')}</p>
        <p className="mt-1 text-sm text-content-strong">{t('stylistPortal.inbox.profileNotFound')}</p>
      </Card>
    )
  }

  const empty = !isLoading && !error && pending.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-content">{t('stylistPortal.inbox.title')}</h1>
          <p className="text-sm text-content-strong">
            {t('stylistPortal.inbox.description')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-busy={isFetching}
        >
          {t('stylistPortal.inbox.refresh')}
        </Button>
      </div>

      {isFetching ? (
        <p role="status" aria-live="polite" className="text-sm text-content-muted">
          {t('common.loading')}
        </p>
      ) : null}

      {error ? (
        <Card className="flex flex-wrap items-center justify-between gap-2 p-4" role="alert">
          <p className="text-sm text-content-strong">{t('stylistPortal.inbox.loadFailed')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </Card>
      ) : null}

      {empty ? (
        <Card className="p-6">
          <p className="font-semibold text-content">{t('stylistPortal.inbox.noRequests')}</p>
          <p className="mt-1 text-sm text-content-strong">
            {t('stylistPortal.inbox.noRequestsDescription')}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {pending.map((r) => (
          <InboxReservationCard
            key={r.id}
            reservation={r}
            profileId={profileId}
            locale={locale}
            acting={actions.actingId === r.id}
            onLock={(id) => void actions.handleLock(id)}
            onUnlock={(id) => void actions.handleUnlock(id)}
            onAccept={(reservation) => void actions.handleAccept(reservation)}
            onReject={(id) => actions.setRejectId(id)}
          />
        ))}
      </div>

      <RejectReservationDialog
        open={actions.rejectId != null}
        onOpenChange={(open) => {
          if (!open) actions.setRejectId(null)
        }}
        pending={actions.actingId === actions.rejectId && reject.isPending}
        onConfirm={actions.handleRejectConfirm}
      />
    </div>
  )
}
