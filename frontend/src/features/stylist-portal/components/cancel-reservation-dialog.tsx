import { useEffect, useState } from 'react'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'

type CancelReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: (reason: string) => void | Promise<void>
}

export const CancelReservationDialog = ({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: CancelReservationDialogProps) => {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Otkazivanje</DialogTitle>
          <DialogDescription>
            Unesite obrazloženje otkazivanja. Klijent će biti obaviješten.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancelReason">Razlog</Label>
          <Textarea
            id="cancelReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Odustani
          </Button>
          <Button type="button" onClick={() => void onConfirm(reason)} disabled={pending}>
            Potvrdi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
