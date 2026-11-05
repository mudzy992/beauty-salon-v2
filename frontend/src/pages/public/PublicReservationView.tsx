import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { getClientReservationStatusKey, formatReservationDate } from '../../features/client-reservations/labels'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
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

const isPublicReservationPayload = (value: unknown): value is PublicReservationPayload => {
  if (typeof value !== 'object' || value === null) return false
  const payload = value as Record<string, unknown>
  const stringFields = [
    'publicReferenceCode',
    'reservationDate',
    'startTime',
    'endTime',
    'status',
    'serviceName',
  ]
  const nullableStringFields = [
    'stylistName',
    'clientNotes',
    'cancelReason',
    'cancelledAt',
    'rescheduleStatus',
    'rescheduleProposedStartTime',
    'rescheduleProposedEndTime',
  ]
  return (
    stringFields.every((field) => typeof payload[field] === 'string') &&
    nullableStringFields.every((field) => payload[field] === null || typeof payload[field] === 'string')
  )
}

export default function PublicReservationView() {
  const { token } = useParams<{ token: string }>()
  const { token: authToken } = useAuth()
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const [data, setData] = useState<PublicReservationPayload | null>(null)
  const [error, setError] = useState<'invalidLink' | 'notFound' | 'loadFailed' | null>(null)
  const [loading, setLoading] = useState(true)
  const requestIdRef = useRef(0)

  const load = useCallback(async () => {
    const cleanToken = token?.trim()
    if (!cleanToken) {
      setData(null)
      setError('invalidLink')
      setLoading(false)
      return
    }
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const response = await api.get<PublicReservationPayload>(
        `/api/public/reservations/by-token/${encodeURIComponent(cleanToken)}`,
      )
      if (!isPublicReservationPayload(response.data)) {
        throw new Error('Invalid public reservation response')
      }
      if (requestId === requestIdRef.current) setData(response.data)
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const responseError =
          typeof error === 'object' && error !== null && 'response' in error
            ? error.response
            : null
        const status =
          typeof responseError === 'object' && responseError !== null && 'status' in responseError
            ? responseError.status
            : undefined
        setData(null)
        setError(status === 404 || status === 410 ? 'notFound' : 'loadFailed')
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [load])

  const statusKey = data
    ? getClientReservationStatusKey(data.status, data.cancelReason)
    : null

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={publicHeader.title}>{t('public.reservationView.title')}</h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {t('public.reservationView.subtitle')}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loading ? (
          <p role="status" aria-live="polite" className="text-center text-slate-600">
            {t('common.loading')}
          </p>
        ) : error ? (
          <Card className="mx-auto max-w-lg rounded-2xl border-slate-200/80 shadow-soft">
            <CardContent className="p-8 text-center space-y-4">
              <p role="alert" className="text-slate-700">{t(`public.reservationView.${error}`)}</p>
              {error === 'loadFailed' ? (
                <Button type="button" variant="outline" className="rounded-full" onClick={() => void load()}>
                  {t('common.retry')}
                </Button>
              ) : null}
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/rezervacija">{t('public.reservationView.newReservation')}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <Card className="mx-auto max-w-lg rounded-2xl border-slate-200/80 shadow-soft">
            <CardContent className="p-8 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('public.reservationView.referenceNumber')}
                </p>
                <p className="text-lg font-semibold text-slate-950 mt-1">
                  {data.publicReferenceCode}
                </p>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{t('public.reservationView.service')}</span>
                  <span className="font-medium text-slate-900 text-right">{data.serviceName}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{t('public.reservationView.date')}</span>
                  <span className="font-medium text-slate-900">{formatReservationDate(data.reservationDate, locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{t('public.reservationView.time')}</span>
                  <span className="font-medium text-slate-900">
                    {data.startTime} – {data.endTime}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">{t('public.reservationView.status')}</span>
                  <span className="font-medium text-slate-900">{statusKey ? t(statusKey) : data.status}</span>
                </div>
                {data.stylistName ? (
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <span className="text-slate-500">{t('public.reservationView.stylist')}</span>
                    <span className="font-medium text-slate-900 text-right">{data.stylistName}</span>
                  </div>
                ) : null}
                {data.rescheduleStatus === 'PENDING' &&
                data.rescheduleProposedStartTime &&
                data.rescheduleProposedEndTime ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-950">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                      {t('public.reservationView.rescheduleTitle')}
                    </p>
                    <p className="mt-1 font-medium">
                      {data.rescheduleProposedStartTime} – {data.rescheduleProposedEndTime}
                    </p>
                    <p className="text-xs text-amber-800 mt-2">
                      {authToken
                        ? t('public.reservationView.signedInInstructions')
                        : t('public.reservationView.guestInstructions')}
                    </p>
                    {authToken ? (
                      <Button asChild size="sm" className="mt-3 rounded-full">
                        <Link to="/moje-rezervacije">{t('public.reservationView.myReservations')}</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
                        <Link to="/login" state={{ from: '/moje-rezervacije' }}>
                          {t('public.reservationView.signIn')}
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : null}
                {data.clientNotes ? (
                  <div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                      {t('public.reservationView.clientNotes')}
                    </p>
                    <p className="mt-1 text-slate-800">{data.clientNotes}</p>
                  </div>
                ) : null}
                {data.cancelReason ? (
                  <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs font-semibold text-rose-800">{t('public.reservationView.cancellationReason')}</p>
                    <p className="mt-1 text-rose-950 text-sm">{data.cancelReason}</p>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                {authToken ? (
                  <Button asChild className="w-full rounded-full" variant="outline">
                    <Link to="/moje-rezervacije">{t('public.reservationView.myReservations')}</Link>
                  </Button>
                ) : (
                  <Button asChild className="w-full rounded-full" variant="outline">
                    <Link to="/login" state={{ from: '/moje-rezervacije' }}>
                      {t('public.reservationView.signIn')}
                    </Link>
                  </Button>
                )}
                <Button asChild className="w-full rounded-full">
                  <Link to="/rezervacija">{t('public.reservationView.bookNewAppointment')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
