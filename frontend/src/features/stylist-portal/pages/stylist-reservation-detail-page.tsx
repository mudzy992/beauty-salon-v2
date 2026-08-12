import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { CancelReservationDialog } from '../components/cancel-reservation-dialog'
import { CompleteReservationDialog } from '../components/complete-reservation-dialog'
import { NoShowReservationDialog } from '../components/no-show-reservation-dialog'
import { OverrunReservationDialog } from '../components/overrun-reservation-dialog'
import { ReservationDetailActions } from '../components/reservation-detail-actions'
import { ReservationDetailSummary } from '../components/reservation-detail-summary'
import { ReorderReservationDialog } from '../components/reorder-reservation-dialog'
import { useReservationDetailActions } from '../hooks/use-reservation-detail-actions'
import { useReservationDetailStatus } from '../hooks/use-reservation-detail-status'
import {
  useClientDebts,
  useReservationActions,
  useStylistReservationDetail,
} from '../hooks/useStylistReservationDetail'

export const StylistReservationDetailPage = () => {
  const { toastApiError, success, warning } = useAppToast()
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const id = String(reservationId ?? '')

  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const { reservation, isLoading, isFetching, refetch } = useStylistReservationDetail({ reservationId: id })
  const actions = useReservationActions()
  const debtsQuery = useClientDebts({ clientId: reservation?.clientId ?? null })
  const status = useReservationDetailStatus({ reservation, profileId, warning })
  const detailActions = useReservationDetailActions({
    reservation,
    actions,
    debtsQuery,
    navigate,
    refetch,
    success,
    toastApiError,
  })

  useEffect(() => {
    const action = searchParams.get('action')
    if (
      action === 'complete' &&
      reservation?.status === 'IN_PROGRESS' &&
      profileId &&
      status.isConfirmedStylist
    ) {
      detailActions.setCompleteOpen(true)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('action')
        return next
      })
    }
  }, [
    searchParams,
    reservation,
    profileId,
    status.isConfirmedStylist,
    setSearchParams,
    detailActions.setCompleteOpen,
  ])

  if (profileLoading || (isLoading && !reservation)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Učitavanje…</div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Rezervacija nije pronađena</p>
        <div className="mt-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Nazad
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <ReservationDetailSummary
        reservation={reservation}
        isFetching={isFetching}
        onRefresh={() => void refetch()}
      />
      <ReservationDetailActions
        reservation={reservation}
        profileId={profileId}
        {...status}
        isStarting={actions.start.isPending}
        isCompleting={actions.completeAndCreateDailyLog.isPending}
        isFetching={isFetching}
        onStart={() => void detailActions.handleStart()}
        onOpenOverrun={() => detailActions.setOverrunOpen(true)}
        onOpenComplete={() => detailActions.setCompleteOpen(true)}
        onOpenNoShow={() => detailActions.setNoShowOpen(true)}
        onOpenCancel={() => detailActions.setCancelOpen(true)}
        onOpenReorder={() => detailActions.setReorderOpen(true)}
        onRefresh={() => void refetch()}
      />
      <CancelReservationDialog
        open={detailActions.cancelOpen}
        onOpenChange={detailActions.setCancelOpen}
        pending={actions.cancel.isPending}
        onConfirm={detailActions.handleCancel}
      />
      <NoShowReservationDialog
        open={detailActions.noShowOpen}
        onOpenChange={detailActions.setNoShowOpen}
        pending={actions.noShow.isPending}
        onConfirm={detailActions.handleNoShow}
      />
      <CompleteReservationDialog
        open={detailActions.completeOpen}
        onOpenChange={detailActions.setCompleteOpen}
        pending={actions.completeAndCreateDailyLog.isPending}
        reservation={reservation}
        debts={debtsQuery.debts}
        debtsLoading={debtsQuery.isLoading}
        profileId={profileId}
        onValidationError={(message) => toastApiError(null, message)}
        onConfirm={detailActions.handleComplete}
      />
      <OverrunReservationDialog
        open={detailActions.overrunOpen}
        onOpenChange={detailActions.setOverrunOpen}
        onActual={detailActions.handleOverrunActual}
        onManual={detailActions.handleOverrunManual}
        onBreakOnly={detailActions.handleOverrunBreakOnly}
      />
      <ReorderReservationDialog
        open={detailActions.reorderOpen}
        onOpenChange={detailActions.setReorderOpen}
        pending={actions.reorder.isPending}
        currentStartTime={reservation.startTime}
        currentEndTime={reservation.endTime}
        onConfirm={detailActions.handleReorder}
      />
    </div>
  )
}

