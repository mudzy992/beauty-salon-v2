import { useTranslation } from 'react-i18next'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatDateOnlyLocale, getSalonDateOnly } from '../../../../../shared/business-date.mjs'
import type { Reservation } from '../types'

/**
 * Kartica rezervacije u inboxu (S10).
 *
 * Izdvojeno iz `pages/stylist-inbox-page.tsx` **bez promjene**: isti naziv
 * usluge, isti datum i termin, isti statusni žeton (uključujući „zaključao si
 * ti"), isti broj otkazivanja i istek kazne, ista napomena klijenta i **isti
 * redoslijed akcija** (zaključaj / prihvati / otključaj / odbij).
 *
 * **FSM se ne mijenja**: `canLock` i `canAccept` se računaju iz istih
 * uslova (`hasLockedOnce`, `LOCKED`, istek zaključavanja, `REJECTED`).
 */
export const InboxReservationCard = ({
  reservation,
  profileId,
  locale,
  acting,
  onLock,
  onUnlock,
  onAccept,
  onReject,
}: {
  reservation: Reservation
  profileId: string
  locale: string
  acting: boolean
  onLock: (reservationId: string) => void
  onUnlock: (reservationId: string) => void
  onAccept: (reservation: Reservation) => void
  onReject: (reservationId: string) => void
}) => {
  const { t } = useTranslation()
  const r = reservation

  const myResponse = r.stylistResponses?.find((x) => x.stylistProfileId === profileId)
  const lockActive =
    myResponse?.status === 'LOCKED' &&
    (!myResponse.lockExpiresAt || new Date(myResponse.lockExpiresAt).getTime() > Date.now())
  const isLockedByMe = lockActive
  const lockedByOther =
    r.status === 'STYLIST_REVIEW' &&
    !isLockedByMe &&
    (r.stylistResponses ?? []).some(
      (x) =>
        x.stylistProfileId !== profileId &&
        x.status === 'LOCKED' &&
        (!x.lockExpiresAt || new Date(x.lockExpiresAt).getTime() > Date.now()),
    )
  const canLock = !isLockedByMe && !lockedByOther && !myResponse?.hasLockedOnce && myResponse?.status !== 'REJECTED'
  const canAccept = !lockedByOther && (isLockedByMe || !!myResponse?.hasLockedOnce)

  const statusLabel =
    r.status === 'STYLIST_REVIEW'
      ? t('stylistPortal.inbox.underReview')
      : t('stylistPortal.inbox.pending')
  const statusVariant = r.status === 'STYLIST_REVIEW' ? ('brand' as const) : ('warning' as const)

  const rec = r.client?.cancellationCount?.[0]
  const count = rec?.cancellationCount ?? 0
  const until = rec?.penaltyUntil ? new Date(rec.penaltyUntil) : null
  const isPenalized = !!until && until.getTime() > Date.now()

  return (
    <Card data-stylist-inbox-card className="p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-content truncate">
            {r.service?.name ?? t('stylistWorkbook.serviceFallback')}
          </p>
          <p className="mt-1 text-sm text-content-strong">
            {formatInboxDate(r.reservationDate, locale)} · {formatInboxTime(r.startTime)}
          </p>
        </div>
        <Badge variant={statusVariant}>
          {r.status === 'STYLIST_REVIEW' && isLockedByMe ? t('stylistPortal.inbox.underReviewByYou') : statusLabel}
        </Badge>
      </div>

      {r.client ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <p className="text-sm text-content-strong">
            {r.client.firstName} {r.client.lastName}
          </p>
          {count > 0 ? <Badge variant="warning">{t('stylistPortal.inbox.cancellationCount', { formattedCount: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count) })}</Badge> : null}
          {isPenalized ? <Badge variant="danger">{t('stylistPortal.inbox.penaltyUntil', { date: formatInboxDate(getSalonDateOnly(until!), locale) })}</Badge> : null}
        </div>
      ) : null}

      {r.clientNotes ? (
        <p className="mt-2 text-sm text-content-strong line-clamp-2">{r.clientNotes}</p>
      ) : null}

      {acting ? (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-content-muted">
          {t('common.loading')}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {lockedByOther ? (
          <p className="text-sm text-content-muted">{t('stylistPortal.inbox.lockedByOther')}</p>
        ) : null}
        {canLock ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onLock(r.id)}
            disabled={acting}
            aria-busy={acting}
          >
            {t('stylistPortal.inbox.lock')}
          </Button>
        ) : null}

        {canAccept ? (
          <Button
            type="button"
            onClick={() => onAccept(r)}
            disabled={acting}
            aria-busy={acting}
          >
            {t('stylistPortal.inbox.accept')}
          </Button>
        ) : null}

        {isLockedByMe ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onUnlock(r.id)}
            disabled={acting}
            aria-busy={acting}
          >
            {t('stylistPortal.inbox.unlock')}
          </Button>
        ) : null}

        {(isLockedByMe || canAccept) && myResponse?.status !== 'REJECTED' ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onReject(r.id)}
            disabled={acting}
            aria-busy={acting}
          >
            {t('stylistPortal.inbox.reject')}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

/** Datum u inboxu — isti format kao prije izdvajanja. */
export const formatInboxDate = (iso: string, locale: string) => {
  try {
    return formatDateOnlyLocale(iso.slice(0, 10), locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

/** Termin u inboxu — samo `HH:MM`. */
export const formatInboxTime = (time: string) => time?.slice(0, 5) ?? time
