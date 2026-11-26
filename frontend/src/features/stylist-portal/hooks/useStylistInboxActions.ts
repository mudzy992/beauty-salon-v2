import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppToast } from '../../../lib/toast/useAppToast'
import { fetchClientDebts } from '../api/stylist-portal.api'
import type { Reservation } from '../types'
import { formatInboxDate } from '../components/inbox-reservation-card'

/**
 * Akcije inboxa (S10).
 *
 * Izdvojeno iz `pages/stylist-inbox-page.tsx` **bez promjene**: isti redoslijed
 * koraka (zaključaj → otključaj → prihvati → odbij), iste poruke o dugu
 * klijenta (upozorenje prije prihvatanja), isti toastovi i isto stanje
 * „u toku" (`actingId`).
 *
 * **FSM se ne mijenja** — prihvatanje i dalje traži da je rezervacija
 * prethodno zaključana (`hasLockedOnce`), a odbijanje se nudi samo iz
 * zaključanog ili već prihvaćenog stanja.
 */
export const useStylistInboxActions = ({
  profileId,
  locale,
  lock,
  unlock,
  accept,
  reject,
}: {
  profileId: string
  locale: string
  lock: { mutateAsync: (reservationId: string) => Promise<unknown> }
  unlock: { mutateAsync: (reservationId: string) => Promise<unknown> }
  accept: { mutateAsync: (reservation: Reservation) => Promise<unknown> }
  reject: { mutateAsync: (args: { reservationId: string; rejectionReason?: string }) => Promise<unknown> }
}) => {
  const { t } = useTranslation()
  const { toastApiError, warning } = useAppToast()
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)

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
              date: formatInboxDate(first.createdAt, locale),
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
              date: formatInboxDate(d.createdAt, locale),
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

  return {
    actingId,
    rejectId,
    setRejectId,
    handleLock,
    handleUnlock,
    handleAccept,
    handleRejectConfirm,
  }
}
