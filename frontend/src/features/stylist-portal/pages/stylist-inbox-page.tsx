import { useMemo, useState } from 'react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { fetchClientDebts } from '../api/stylist-portal.api'
import { useStylistInboxReservations } from '../hooks/useStylistReservations'
import type { Reservation } from '../types'

const getStatusBadge = (r: Reservation) => {
  if (r.status === 'STYLIST_REVIEW') return { label: 'Na pregledu', variant: 'brand' as const }
  return { label: 'Na čekanju', variant: 'warning' as const }
}

const getMyResponse = (r: Reservation, profileId: string) =>
  r.stylistResponses?.find((x) => x.stylistProfileId === profileId)

const formatDate = (iso: string) => {
  const d = new Date(iso.slice(0, 10))
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('bs-BA', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const formatTime = (t: string) => t?.slice(0, 5) ?? t

export const StylistInboxPage = () => {
  const { toastApiError, warning } = useAppToast()
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const [actingId, setActingId] = useState<string | null>(null)

  const { reservations, isLoading, isFetching, refetch, lock, accept, reject } =
    useStylistInboxReservations({ stylistProfileId: profileId })

  const pending = useMemo(() => reservations, [reservations])

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Učitavanje…</div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Nema profila</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Profil stilista nije pronađen.</p>
      </Card>
    )
  }

  const handleLock = async (reservationId: string) => {
    setActingId(reservationId)
    try {
      await lock.mutateAsync(reservationId)
    } catch (err) {
      toastApiError(err, 'Greška pri zaključavanju')
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
            `Klijent ima dugovanje kod vas${first.service?.name ? ` (${first.service.name})` : ''} od ${first.createdAt.slice(0, 10)}.`,
          )
        }
        if (others.length > 0) {
          const d = others[0]
          const stylistName = d.stylistProfile?.user
            ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || 'drugog stiliste'
            : 'drugog stiliste'
          lines.push(
            `Klijent ima dugovanje kod ${stylistName}${d.service?.name ? ` (${d.service.name})` : ''} od ${d.createdAt.slice(0, 10)}.`,
          )
        }
        if (lines.length > 0) warning('Dugovanje klijenta', lines.join(' '))
      } catch {
        // ignore (mobile parity)
      }

      await accept.mutateAsync(reservation)
    } catch (err) {
      toastApiError(err, 'Greška pri prihvatanju')
    } finally {
      setActingId(null)
    }
  }

  const handleReject = async (reservationId: string) => {
    setActingId(reservationId)
    try {
      await reject.mutateAsync({ reservationId })
    } catch (err) {
      toastApiError(err, 'Greška pri odbijanju')
    } finally {
      setActingId(null)
    }
  }

  const empty = !isLoading && pending.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Inbox</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Rezervacije koje trebaju vaš odgovor (zaključaj → prihvati ili odbij).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          Osvježi
        </Button>
      </div>

      {empty ? (
        <Card className="p-6">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Nema novih zahtjeva</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Kad stigne nova rezervacija, pojavit će se ovdje.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-3">
        {pending.map((r) => {
          const myResponse = getMyResponse(r, profileId)
          const isLockedByMe = r.status === 'STYLIST_REVIEW' && myResponse?.status === 'LOCKED'
          const canLock = r.status === 'PENDING'
          const acting = actingId === r.id
          const status = getStatusBadge(r)

          const rec = r.client?.cancellationCount?.[0]
          const count = rec?.cancellationCount ?? 0
          const until = rec?.penaltyUntil ? new Date(rec.penaltyUntil) : null
          const isPenalized = !!until && until.getTime() > Date.now()

          return (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                    {r.service?.name ?? 'Usluga'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(r.reservationDate)} · {formatTime(r.startTime)}
                  </p>
                </div>
                <Badge variant={status.variant}>
                  {r.status === 'STYLIST_REVIEW' && isLockedByMe ? 'Na pregledu (vi)' : status.label}
                </Badge>
              </div>

              {r.client ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {r.client.firstName} {r.client.lastName}
                  </p>
                  {count > 0 ? <Badge variant="warning">CXL: {count}</Badge> : null}
                  {isPenalized ? <Badge variant="danger">PENAL do {until!.toISOString().slice(0, 10)}</Badge> : null}
                </div>
              ) : null}

              {r.clientNotes ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 line-clamp-2">{r.clientNotes}</p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {canLock ? (
                  <Button type="button" variant="outline" onClick={() => handleLock(r.id)} disabled={acting}>
                    Zaključaj
                  </Button>
                ) : null}

                {isLockedByMe ? (
                  <>
                    <Button type="button" onClick={() => handleAccept(r)} disabled={acting}>
                      Prihvati
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => handleReject(r.id)} disabled={acting}>
                      Odbij
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

