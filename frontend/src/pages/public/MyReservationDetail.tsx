import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { useAuth } from '../../context/AuthContext'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { PaymentSummaryBlock } from '../../features/client-reservations/payment-summary-block'
import {
  formatReservationDate,
  getClientReservationServicesLabel,
  getClientReservationStatusKey,
  getClientReservationStylistLabel,
} from '../../features/client-reservations/labels'
import type { Reservation, ReservationPaymentSummary } from '../../features/reservations/types'
import { publicAurum, publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { useTheme } from '../../features/shell/theme/theme-context'

type ReservationDetail = Reservation & {
  paymentSummary?: ReservationPaymentSummary | null
}

export default function MyReservationDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const { skin } = useTheme()
  const isAurum = skin === 'aurum'
  const locale = getIntlLocale(i18n.language)
  const { token, isReady, user } = useAuth()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!isReady) return
    if (!token) {
      navigate('/login', { state: { from: `/moje-rezervacije/${id ?? ''}` }, replace: true })
    }
  }, [isReady, token, navigate, id])

  const load = useCallback(async () => {
    if (!id) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    setNotFound(false)
    try {
      const { data } = await api.get<ReservationDetail>(`/api/reservations/${id}`)
      if (!data || data.id !== id) throw new Error('Reservation response did not match the requested id')
      if (requestId === requestIdRef.current) setReservation(data)
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const response =
          typeof error === 'object' && error !== null && 'response' in error
            ? error.response
            : null
        const status =
          typeof response === 'object' && response !== null && 'status' in response
            ? response.status
            : undefined
        const unavailable = status === 403 || status === 404
        setReservation(null)
        setNotFound(unavailable)
        setLoadError(!unavailable)
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!token || !id) return
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [token, id, load])

  if (!user) return null

  const stylist = reservation ? getClientReservationStylistLabel(reservation) : null
  const statusKey = reservation
    ? getClientReservationStatusKey(reservation.status, reservation.cancelReason)
    : null
  const servicesLabel = reservation
    ? getClientReservationServicesLabel(reservation, t('public.reserve.service'))
    : ''

  return (
    <div data-aurum-page="reservation-detail" className={`bg-white min-h-screen pb-20 ${isAurum ? publicAurum.page : ''}`}>
      <div data-aurum-page-hero className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={`${publicHeader.title} ${isAurum ? publicAurum.heading : ''}`}>{t('public.myReservations.detailTitle')}</h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {t('public.myReservations.detailSubtitle')}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero} space-y-6 max-w-2xl`}>
        <Button asChild variant="ghost" className="rounded-full px-0">
          <Link to="/moje-rezervacije">{t('public.myReservations.backToList')}</Link>
        </Button>

        {loading ? (
          <p role="status" aria-live="polite" className="text-center text-slate-600">
            {t('common.loading')}
          </p>
        ) : loadError ? (
          <div role="alert" className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-rose-600">{t('public.myReservations.detailLoadFailed')}</p>
            <Button type="button" variant="outline" onClick={() => void load()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : !reservation || notFound ? (
          <p className="text-center text-slate-600">{t('public.myReservations.notFound')}</p>
        ) : (
          <Card className="rounded-2xl border-slate-200/80 shadow-soft" data-aurum-surface>
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-950">
                    {servicesLabel}
                  </p>
                  {reservation.publicReferenceCode ? (
                    <p className="text-xs text-slate-500 mt-0.5">{reservation.publicReferenceCode}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {statusKey ? t(statusKey) : reservation.status}
                </span>
              </div>

              <div className="grid gap-1.5 text-sm text-slate-700">
                <p>
                  <time dateTime={reservation.reservationDate.slice(0, 10)}>{formatReservationDate(reservation.reservationDate, locale)}</time> · {reservation.startTime}–{reservation.endTime}
                </p>
                {stylist ? <p>{t('public.myReservations.stylistLabel', { name: stylist })}</p> : null}
              </div>

              {reservation.paymentSummary ? (
                <PaymentSummaryBlock payment={reservation.paymentSummary} />
              ) : reservation.status === 'COMPLETED' ? (
                <p className="text-sm text-slate-500">{t('public.myReservations.paymentUnavailable')}</p>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
