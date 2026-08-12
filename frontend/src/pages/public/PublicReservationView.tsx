import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'

export interface PublicReservationPayload {
  publicReferenceCode: string
  reservationDate: string
  startTime: string
  endTime: string
  status: string
  serviceName: string
  stylistName: string | null
  clientNotes: string | null
  cancelReason: string | null
  cancelledAt: string | null
  rescheduleStatus: string | null
  rescheduleProposedStartTime: string | null
  rescheduleProposedEndTime: string | null
}

const statusLabel: Record<string, string> = {
  PENDING: 'Na čekanju',
  STYLIST_REVIEW: 'U obradi',
  CONFIRMED: 'Potvrđeno',
  ATTENDANCE_CONFIRMED: 'Dolazak potvrđen',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završeno',
  CANCELLED_BY_CLIENT: 'Otkazano (klijent)',
  CANCELLED_BY_STYLISTS: 'Otkazano (salon)',
  NO_SHOW: 'Nije se pojavio/la',
}

const formatStatus = (s: string) => statusLabel[s] ?? s

export default function PublicReservationView() {
  const { token } = useParams<{ token: string }>()
  const { token: authToken } = useAuth()
  const [data, setData] = useState<PublicReservationPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = token?.trim()
    if (!t) {
      setError('Nevažeći link.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .get<PublicReservationPayload>(`/api/public/reservations/by-token/${encodeURIComponent(t)}`)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch(() => {
        if (!cancelled) setError('Termin nije pronađen ili je link istekao / nevažeći.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={publicHeader.title}>Detalji termina</h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            Pregled vaše rezervacije putem sigurnog linka iz emaila.
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loading ? (
          <p className="text-center text-slate-600">Učitavanje…</p>
        ) : error ? (
          <Card className="mx-auto max-w-lg rounded-2xl border-slate-200/80 shadow-soft">
            <CardContent className="p-8 text-center space-y-4">
              <p className="text-slate-700">{error}</p>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/rezervacija">Nova rezervacija</Link>
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <Card className="mx-auto max-w-lg rounded-2xl border-slate-200/80 shadow-soft">
            <CardContent className="p-8 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Broj termina
                </p>
                <p className="text-lg font-semibold text-slate-950 mt-1">
                  {data.publicReferenceCode}
                </p>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Usluga</span>
                  <span className="font-medium text-slate-900 text-right">{data.serviceName}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Datum</span>
                  <span className="font-medium text-slate-900">{data.reservationDate}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Vrijeme</span>
                  <span className="font-medium text-slate-900">
                    {data.startTime} – {data.endTime}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Status</span>
                  <span className="font-medium text-slate-900">{formatStatus(data.status)}</span>
                </div>
                {data.stylistName ? (
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Stilist</span>
                    <span className="font-medium text-slate-900 text-right">{data.stylistName}</span>
                  </div>
                ) : null}
                {data.rescheduleStatus === 'PENDING' &&
                data.rescheduleProposedStartTime &&
                data.rescheduleProposedEndTime ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      Predloženi novi termin
                    </p>
                    <p className="mt-1 font-medium">
                      {data.rescheduleProposedStartTime} – {data.rescheduleProposedEndTime}
                    </p>
                    <p className="text-xs text-amber-800 mt-2">
                      {authToken
                        ? 'Otvorite Moje rezervacije da prihvatite ili odbijete predloženi termin.'
                        : 'Prijavite se ili otvorite mobilnu aplikaciju da potvrdite ili odbijete predloženi termin.'}
                    </p>
                    {authToken ? (
                      <Button asChild size="sm" className="mt-3 rounded-full">
                        <Link to="/moje-rezervacije">Moje rezervacije</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                        <Link to="/login" state={{ from: '/moje-rezervacije' }}>
                          Prijavi se
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : null}
                {data.clientNotes ? (
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                      Vaša napomena
                    </p>
                    <p className="mt-1 text-slate-800">{data.clientNotes}</p>
                  </div>
                ) : null}
                {data.cancelReason ? (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs font-semibold text-rose-800">Razlog otkazivanja</p>
                    <p className="mt-1 text-rose-950 text-sm">{data.cancelReason}</p>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                {authToken ? (
                  <Button asChild className="w-full rounded-full" variant="outline">
                    <Link to="/moje-rezervacije">Moje rezervacije</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full rounded-full" variant="outline">
                    <Link to="/login" state={{ from: '/moje-rezervacije' }}>
                      Prijavi se
                    </Link>
                  </Button>
                )}
                <Button asChild className="w-full rounded-full">
                  <Link to="/rezervacija">Zakaži novi termin</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
