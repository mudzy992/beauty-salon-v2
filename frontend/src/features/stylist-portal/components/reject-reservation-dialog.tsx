import { useState } from 'react'

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

type RejectReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: (rejectionReason: string) => void | Promise<void>
}

export const RejectReservationDialog = ({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: RejectReservationDialogProps) => {
  const [reason, setReason] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('')
    onOpenChange(next)
  }

  const handleConfirm = async () => {
    const trimmed = reason.trim().slice(0, 500)
    if (!trimmed) return
    await onConfirm(trimmed)
    setReason('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Odbij rezervaciju</DialogTitle>
          <DialogDescription>
            Unesite razlog odbijanja. Obrazloženje se čuva uz vaš odgovor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejectionReason">Razlog</Label>
          <Textarea
            id="rejectionReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            aria-required="true"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Odustani
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={pending || reason.trim().length === 0}
          >
            Odbij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
