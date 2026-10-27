import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'

type OverrunReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onActual: () => void | Promise<void>
  onManual: (minutes: number) => void | Promise<void>
  onBreakOnly: () => void | Promise<void>
}

export const OverrunReservationDialog = ({
  open,
  onOpenChange,
  onActual,
  onManual,
  onBreakOnly,
}: OverrunReservationDialogProps) => {
  const { t } = useTranslation()
  const [manualShiftMinutes, setManualShiftMinutes] = useState('5')
  const manualMinutes = Math.max(
    0,
    Math.floor(parseInt(manualShiftMinutes || '0', 10) || 0),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistPortal.reservationDialogs.overrun.title')}</DialogTitle>
          <DialogDescription>
            {t('stylistPortal.reservationDialogs.overrun.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button type="button" onClick={() => void onActual()}>
            {t('stylistPortal.reservationDialogs.overrun.actualOverrun')}
          </Button>
          <div className="space-y-2">
            <Label htmlFor="manualShift">{t('stylistPortal.reservationDialogs.overrun.manualMinutes')}</Label>
            <Input
              id="manualShift"
              value={manualShiftMinutes}
              onChange={(event) => setManualShiftMinutes(event.target.value)}
              inputMode="numeric"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void onManual(manualMinutes)}
            >
              {t('stylistPortal.reservationDialogs.overrun.manualShift')}
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={() => void onBreakOnly()}>
            {t('stylistPortal.reservationDialogs.overrun.useShorterBreak')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
