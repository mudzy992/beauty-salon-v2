import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { fetchClientDebts } from '../api/stylist-portal.api'
import { RejectReservationDialog } from '../components/reject-reservation-dialog'
import { useStylistInboxReservations } from '../hooks/useStylistReservations'
import type { Reservation } from '../types'
import { formatDateOnlyLocale, getSalonDateOnly } from '../../../../../shared/business-date.mjs'
import { getIntlLocale } from '../../../i18n/locale-utils.mjs'

const getStatusBadge = (r: Reservation, t: (key: string) => string) => {
  if (r.status === 'STYLIST_REVIEW') {
    return { label: t('stylistPortal.inbox.underReview'), variant: 'brand' as const }
  }
  return { label: t('stylistPortal.inbox.pending'), variant: 'warning' as const }
}

const getMyResponse = (r: Reservation, profileId: string) =>
  r.stylistResponses?.find((x) => x.stylistProfileId === profileId)

const formatDate = (iso: string, locale: string) => {
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

const formatTime = (t: string) => t?.slice(0, 5) ?? t

export const StylistInboxPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { toastApiError, warning } = useAppToast()
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)

  const { reservations, isLoading, isFetching, error, refetch, lock, unlock, accept, reject } =
    useStylistInboxReservations({ stylistProfileId: profileId })

  const pending = useMemo(() => reservations, [reservations])

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">{t('common.loading')}</div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">{t('stylistPortal.inbox.noProfile')}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.inbox.profileNotFound')}</p>
      </Card>
    )
  }

  const handleLock = async (reservationId: string) => {
    setActingId(reservationId)
    try {
      await lock.mutateAsync(reservationId)
    } catch (err) {
      toastApiError(err, t('stylistPortal.inbox.lockFailed'))
    } finally {
      setActingId(null)
    }
  }

  const handleUnlock = async (reservationId: string) => {
    setActingId(reservationId)
    try {
      await unlock.mutateAsync(reservationId)
    } catch (err) {
      toastApiError(err, t('stylistPortal.inbox.unlockFailed'))
    } finally {
      setActingId(null)
    }
  }

  const handleAccept = async (reservation: Reservation) => {
    setActingId(reservation.id)
    try {
      try {
        const debts = await fetchClientDebts(reservation.clientId)
        const mine = debts.filter((d) => d.stylistProfileId === profileId)
        const others = debts.filter((d) => d.stylistProfileId !== profileId)
        const lines: string[] = []
        if (mine.length > 0) {
          const first = mine[0]
          lines.push(
            t('stylistPortal.inbox.ownDebtWarning', {
              service: first.service?.name ? ` (${first.service.name})` : '',
              date: formatDate(first.createdAt, locale),
            }),
          )
        }
        if (others.length > 0) {
          const d = others[0]
          const stylistName = d.stylistProfile?.user
            ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || t('stylistPortal.inbox.otherStylist')
            : t('stylistPortal.inbox.otherStylist')
          lines.push(
            t('stylistPortal.inbox.otherDebtWarning', {
              stylist: stylistName,
              service: d.service?.name ? ` (${d.service.name})` : '',
              date: formatDate(d.createdAt, locale),
            }),
          )
        }
        if (lines.length > 0) warning(t('stylistPortal.inbox.clientDebtWarning'), lines.join(' '))
      } catch {
        // ignore (mobile parity)
      }

      await accept.mutateAsync(reservation)
    } catch (err) {
      toastApiError(err, t('stylistPortal.inbox.acceptFailed'))
    } finally {
      setActingId(null)
    }
  }

  const handleRejectConfirm = async (rejectionReason: string) => {
    if (!rejectId) return
    setActingId(rejectId)
    try {
      await reject.mutateAsync({ reservationId: rejectId, rejectionReason })
      setRejectId(null)
    } catch (err) {
      toastApiError(err, t('stylistPortal.inbox.rejectFailed'))
    } finally {
      setActingId(null)
    }
  }

  const empty = !isLoading && !error && pending.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('stylistPortal.inbox.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('stylistPortal.inbox.description')}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {t('stylistPortal.inbox.refresh')}
        </Button>
      </div>

      {error ? (
        <Card className="flex flex-wrap items-center justify-between gap-2 p-4" role="alert">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.inbox.loadFailed')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </Card>
      ) : null}

      {empty ? (
        <Card className="p-6">
          <p className="font-semibold text-slate-900 dark:text-slate-50">{t('stylistPortal.inbox.noRequests')}</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('stylistPortal.inbox.noRequestsDescription')}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {pending.map((r) => {
          const myResponse = getMyResponse(r, profileId)
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
          const acting = actingId === r.id
          const status = getStatusBadge(r, t)

          const rec = r.client?.cancellationCount?.[0]
          const count = rec?.cancellationCount ?? 0
          const until = rec?.penaltyUntil ? new Date(rec.penaltyUntil) : null
          const isPenalized = !!until && until.getTime() > Date.now()

          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                    {r.service?.name ?? t('stylistWorkbook.serviceFallback')}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(r.reservationDate, locale)} · {formatTime(r.startTime)}
                  </p>
                </div>
                <Badge variant={status.variant}>
                  {r.status === 'STYLIST_REVIEW' && isLockedByMe ? t('stylistPortal.inbox.underReviewByYou') : status.label}
                </Badge>
              </div>

              {r.client ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {r.client.firstName} {r.client.lastName}
                  </p>
                  {count > 0 ? <Badge variant="warning">CXL: {t('stylistPortal.inbox.cancellationCount', { formattedCount: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count) })}</Badge> : null}
                  {isPenalized ? <Badge variant="danger">{t('stylistPortal.inbox.penaltyUntil', { date: formatDate(getSalonDateOnly(until!), locale) })}</Badge> : null}
                </div>
              ) : null}

              {r.clientNotes ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{r.clientNotes}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {lockedByOther ? (
                  <p className="text-sm text-slate-500">{t('stylistPortal.inbox.lockedByOther')}</p>
                ) : null}
                {canLock ? (
                  <Button type="button" variant="outline" onClick={() => handleLock(r.id)} disabled={acting}>
                    {t('stylistPortal.inbox.lock')}
                  </Button>
                ) : null}

                {canAccept ? (
                  <Button type="button" onClick={() => handleAccept(r)} disabled={acting}>
                    {t('stylistPortal.inbox.accept')}
                  </Button>
                ) : null}

                {isLockedByMe ? (
                  <Button type="button" variant="outline" onClick={() => handleUnlock(r.id)} disabled={acting}>
                    {t('stylistPortal.inbox.unlock')}
                  </Button>
                ) : null}

                {(isLockedByMe || canAccept) && myResponse?.status !== 'REJECTED' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setRejectId(r.id)}
                    disabled={acting}
                  >
                    {t('stylistPortal.inbox.reject')}
                  </Button>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>

      <RejectReservationDialog
        open={rejectId != null}
        onOpenChange={(open) => {
          if (!open) setRejectId(null)
        }}
        pending={actingId === rejectId && reject.isPending}
        onConfirm={handleRejectConfirm}
      />
    </div>
  )
}

