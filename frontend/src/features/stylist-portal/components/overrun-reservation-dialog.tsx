import { useState } from 'react'

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
  const [manualShiftMinutes, setManualShiftMinutes] = useState('5')
  const manualMinutes = Math.max(
    0,
    Math.floor(parseInt(manualShiftMinutes || '0', 10) || 0),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kašnjenje termina</DialogTitle>
          <DialogDescription>
            Odaberite kako želite obraditi kašnjenje prije nastavka rada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Button type="button" onClick={() => void onActual()}>
            Rekalkuliši po stvarnom kašnjenju
          </Button>
          <div className="space-y-2">
            <Label htmlFor="manualShift">Ručni unos minuta</Label>
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
              Rekalkuliši po ručnom unosu
            </Button>
          </div>
          <Button type="button" variant="ghost" onClick={() => void onBreakOnly()}>
            Ne pomjeraj termine (iskoristi kraću pauzu)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
