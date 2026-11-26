import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import type { ClientDebt, Reservation } from '../types'
import { buildCompleteDialogHints } from '../utils/complete-dialog-helpers'
import { ClientDebtSelector } from './client-debt-selector'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'
import { useCompleteReservationDialogState } from '../hooks/useCompleteReservationDialogState'
import type { CompleteReservationPayload } from '../types/complete-reservation'

export type { CompleteReservationPayload } from '../types/complete-reservation'

type CompleteReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  reservation: Reservation
  debts: ClientDebt[]
  debtsLoading: boolean
  profileId: string | null
  onValidationError: (message: string) => void
  onConfirm: (payload: CompleteReservationPayload) => void | Promise<void>
}

export const CompleteReservationDialog = ({
  open,
  onOpenChange,
  pending,
  reservation,
  debts,
  debtsLoading,
  profileId,
  onValidationError,
  onConfirm,
}: CompleteReservationDialogProps) => {
  const { t, i18n } = useTranslation()
  const form = useCompleteReservationDialogState({
    open,
    reservation,
    debts,
    onValidationError,
    onConfirm,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistPortal.reservationDialogs.complete.title')}</DialogTitle>
          <DialogDescription>
            {buildCompleteDialogHints(reservation)
              .map(({ key, amount }) =>
                t(key, amount === undefined
                  ? undefined
                  : { amount: formatLocalizedAmount(amount, i18n.language) }),
              )
              .join(' ')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="price">{t('stylistPortal.reservationDialogs.complete.paidAmount')}</Label>
          <Input
            id="price"
            value={form.actualPrice}
            onChange={(event) => form.setActualPrice(event.target.value)}
            inputMode="decimal"
          />
          <p className="text-sm text-content-strong">
            {t('stylistPortal.reservationDialogs.complete.chargeAmount', {
              amount: formatLocalizedAmount(form.chargeAmount, i18n.language),
            })}
          </p>
          {form.tipAmount > 0 ? (
            <p className="text-sm text-content-strong">
              {t('stylistPortal.reservationDialogs.complete.tipAmount', {
                amount: formatLocalizedAmount(form.tipAmount, i18n.language),
              })}
            </p>
          ) : null}
          {form.shortfall > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.createDebt}
                onChange={(event) => form.setCreateDebt(event.target.checked)}
              />
              {t('stylistPortal.reservationDialogs.complete.recordDebt', {
                amount: formatLocalizedAmount(form.shortfall, i18n.language),
              })}
            </label>
          ) : null}
        </div>
        <ClientDebtSelector
          debts={debts}
          isLoading={debtsLoading}
          profileId={profileId}
          selectedDebtIds={form.selectedDebtIds}
          selectedDebtSum={form.selectedDebtSum}
          onToggle={(debtId) =>
            form.setSelectedDebtIds((current) => ({
              ...current,
              [debtId]: !current[debtId],
            }))
          }
        />
        {reservation.payDebtsIntent && debts.length > 0 ? (
          <label className="flex items-start gap-2 text-sm text-content-strong">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.skipDebtsDespiteIntent}
              onChange={(event) => form.setSkipDebtsDespiteIntent(event.target.checked)}
            />
            <span>{t('stylistPortal.reservationDialogs.complete.skipDebtsDespiteIntent')}</span>
          </label>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="notes">{t('stylistPortal.reservationDialogs.complete.notes')}</Label>
          <Textarea id="notes" value={form.notes} onChange={(event) => form.setNotes(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void form.handleConfirm()} disabled={pending}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
