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

type NoShowReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: (reason: string, applyPenalty: boolean) => void | Promise<void>
}

export const NoShowReservationDialog = ({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: NoShowReservationDialogProps) => {
  const [reason, setReason] = useState('')
  const [applyPenalty, setApplyPenalty] = useState(true)

  useEffect(() => {
    if (!open) return
    setReason('')
    setApplyPenalty(true)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Klijent se nije pojavio</DialogTitle>
          <DialogDescription>
            Označite no-show i po potrebi primijenite penal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="noShowReason">Obrazloženje</Label>
          <Textarea
            id="noShowReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={applyPenalty ? 'default' : 'outline'}
            onClick={() => setApplyPenalty((value) => !value)}
          >
            Penal: {applyPenalty ? 'DA' : 'NE'}
          </Button>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Primijeni penal za no-show.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Odustani
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm(reason, applyPenalty)}
            disabled={pending}
          >
            Označi no-show
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
