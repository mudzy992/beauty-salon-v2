import { useCallback, useEffect, useState } from 'react'
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
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { useAppToast } from '../../lib/toast/useAppToast'

type ReservationDetail = Reservation & {
  paymentSummary?: ReservationPaymentSummary | null
}

export default function MyReservationDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { token, isReady, user } = useAuth()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [reservation, setReservation] = useState<ReservationDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady) return
    if (!token) {
      navigate('/login', { state: { from: `/moje-rezervacije/${id ?? ''}` }, replace: true })
    }
  }, [isReady, token, navigate, id])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await api.get<ReservationDetail>(`/api/reservations/${id}`)
      setReservation(data)
    } catch {
      toast.error(t('common.error'))
      setReservation(null)
    } finally {
      setLoading(false)
    }
  }, [id, t, toast])

  useEffect(() => {
    if (!token || !id) return
    void load()
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
    <div className="bg-white min-h-screen pb-20">
      <div className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={publicHeader.title}>{t('public.myReservations.detailTitle')}</h1>
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
          <p className="text-center text-slate-600">{t('common.loading')}</p>
        ) : !reservation ? (
          <p className="text-center text-slate-600">{t('public.myReservations.notFound')}</p>
        ) : (
          <Card className="rounded-2xl border-slate-200/80 shadow-soft">
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
                  {formatReservationDate(reservation.reservationDate, locale)} · {reservation.startTime}–{reservation.endTime}
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
