import { useState } from 'react'
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
  const { t } = useTranslation()
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
          <DialogTitle>{t('stylistPortal.reservationDialogs.reject.title')}</DialogTitle>
          <DialogDescription>
            {t('stylistPortal.reservationDialogs.reject.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rejectionReason">{t('stylistPortal.reservationDialogs.reject.reason')}</Label>
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
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={pending || reason.trim().length === 0}
          >
            {t('stylistPortal.inbox.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
