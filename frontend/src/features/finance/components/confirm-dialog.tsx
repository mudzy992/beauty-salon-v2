import { useState } from 'react'

import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from './responsive-dialog'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  isDestructive?: boolean
  isPending?: boolean
  /** Kada je postavljeno, potvrda traži tekstualni razlog. */
  reasonLabel?: string
  minReasonLength?: number
  onConfirm: (reason: string) => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Potvrdi',
  isDestructive = false,
  isPending = false,
  reasonLabel,
  minReasonLength = 3,
  onConfirm,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const requiresReason = Boolean(reasonLabel)
  const isReasonValid = !requiresReason || reason.trim().length >= minReasonLength

  const handleOpenChange = (next: boolean) => {
    if (!next) setReason('')
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      className="max-w-md"
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Odustani
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={() => onConfirm(reason.trim())}
            disabled={isPending || !isReasonValid}
          >
            {isPending ? 'Obrada…' : confirmLabel}
          </Button>
        </div>
      }
    >
      {requiresReason ? (
        <div className="space-y-2">
          <Label htmlFor="confirm-reason">{reasonLabel}</Label>
          <Textarea
            id="confirm-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={`Najmanje ${minReasonLength} znaka…`}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Razlog se trajno bilježi u historiji knjige.
          </p>
        </div>
      ) : null}
    </ResponsiveDialog>
  )
}
