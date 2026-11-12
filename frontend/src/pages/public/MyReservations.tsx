import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { fetchAllReservationPages } from '../../features/reservations/reservation-list.api'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../context/AuthContext'
import { CancelReservationDialog } from '../../features/client-reservations/cancel-reservation-dialog'
import { resolveClientReservationError } from '../../features/client-reservations/client-reservation-error.mjs'
import { MyReservationCard } from '../../features/client-reservations/my-reservation-card'
import {
  apiErrorMessage,
  partitionClientReservations,
} from '../../features/client-reservations/partition'
import type { Reservation } from '../../features/reservations/types'
import { useReservationSocketRefresh } from '../../features/reservations/use-reservation-socket-refresh'
import { publicAurum, publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'
import { useTheme } from '../../features/shell/theme/theme-context'
import { useAppToast } from '../../lib/toast/useAppToast'

export default function MyReservations() {
  const { t } = useTranslation()
  const { skin } = useTheme()
  const isAurum = skin === 'aurum'
  const { token, isReady, user } = useAuth()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const requestIdRef = useRef(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (!isReady) return
    if (!token) {
      navigate('/login', { state: { from: '/moje-rezervacije' }, replace: true })
    }
  }, [isReady, token, navigate])

  const localizeActionError = useCallback(
    (err: unknown) => {
      const backendMessage = apiErrorMessage(err, '')
      const localizedError = resolveClientReservationError(backendMessage)
      return localizedError
        ? t(`public.myReservations.${localizedError.key}`, localizedError.values)
        : t('common.error')
    },
    [t],
  )

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const data = await fetchAllReservationPages<Reservation>({ asClient: 'true' })
      if (requestId === requestIdRef.current) setItems(data)
    } catch {
      if (requestId === requestIdRef.current) setLoadError(true)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [token, load])

  useReservationSocketRefresh(load)

  const { upcoming, past } = useMemo(() => partitionClientReservations(items), [items])

  const runAction = async (
    r: Reservation,
    action: () => Promise<void>,
    successMsg: string,
  ) => {
    setBusyId(r.id)
    try {
      await action()
      toast.success(successMsg)
      await load()
    } catch (err) {
      toast.error(localizeActionError(err))
    } finally {
      setBusyId(null)
    }
  }

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return
    const id = cancelTarget.id
    setBusyId(id)
    try {
      await api.post(`/api/reservations/${id}/cancel`, {
        ...(cancelReason.trim() ? { cancelReason: cancelReason.trim() } : {}),
      })
      toast.success(t('public.myReservations.toastCancelled'))
      setCancelTarget(null)
      setCancelReason('')
      await load()
    } catch (err) {
      toast.error(localizeActionError(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!user) return null

  const renderList = (list: Reservation[], empty: string) => {
    if (list.length === 0) {
      return <p className="text-sm text-slate-500">{empty}</p>
    }
    return (
      <div className="grid gap-4">
        {list.map((r) => (
          <MyReservationCard
            key={r.id}
            reservation={r}
            busyId={busyId}
            onOpenDetail={(row) => navigate(`/moje-rezervacije/${row.id}`)}
            onConfirmAttendance={(row) =>
              void runAction(
                row,
                () => api.post(`/api/reservations/${row.id}/confirm-attendance`),
                t('public.myReservations.toastAttendanceConfirmed'),
              )
            }
            onAcceptReschedule={(row) =>
              void runAction(
                row,
                () => api.post(`/api/reservations/${row.id}/reschedule/accept`),
                t('public.myReservations.toastRescheduleAccepted'),
              )
            }
            onDeclineReschedule={(row) =>
              void runAction(
                row,
                () => api.post(`/api/reservations/${row.id}/reschedule/decline`),
                t('public.myReservations.toastRescheduleDeclined'),
              )
            }
            onCancel={(row) => {
              setCancelReason('')
              setCancelTarget(row)
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div data-aurum-page="my-reservations" className={`bg-white min-h-screen pb-20 ${isAurum ? publicAurum.page : ''}`}>
      <div data-aurum-page-hero className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={`${publicHeader.title} ${isAurum ? publicAurum.heading : ''}`}>{t('public.myReservations.title')}</h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {t('public.myReservations.subtitle')}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero} space-y-10`}>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button asChild className="rounded-full" data-aurum-cta="primary">
            <Link to="/rezervacija">{t('public.nav.reserve')}</Link>
          </Button>
        </div>

        {loading ? (
          <p role="status" aria-live="polite" className="text-center text-slate-600">
            {t('common.loading')}
          </p>
        ) : loadError ? (
          <div role="alert" className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-rose-600">{t('public.myReservations.loadFailed')}</p>
            <Button type="button" variant="outline" onClick={() => void load()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('public.myReservations.upcoming')}
              </h2>
              {renderList(upcoming, t('public.myReservations.noUpcoming'))}
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {t('public.myReservations.past')}
              </h2>
              {renderList(past, t('public.myReservations.noPast'))}
            </section>
          </>
        )}
      </div>

      <CancelReservationDialog
        open={Boolean(cancelTarget)}
        busy={busyId === cancelTarget?.id}
        reason={cancelReason}
        title={t('public.myReservations.cancelTitle')}
        description={t('public.myReservations.cancelConfirm')}
        reasonLabel={t('public.myReservations.cancelReason')}
        reasonPlaceholder={t('public.myReservations.cancelReasonPlaceholder')}
        confirmLabel={t('public.myReservations.cancelReservation')}
        dismissLabel={t('common.cancel')}
        onReasonChange={setCancelReason}
        onConfirm={() => void handleConfirmCancel()}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null)
            setCancelReason('')
          }
        }}
      />
    </div>
  )
}
