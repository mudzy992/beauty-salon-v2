import { useEffect, useState } from 'react'
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
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistPortal.reservationDialogs.cancel.title')}</DialogTitle>
          <DialogDescription>
            {t('stylistPortal.reservationDialogs.cancel.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancelReason">{t('stylistPortal.reservationDialogs.cancel.reason')}</Label>
          <Textarea
            id="cancelReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void onConfirm(reason)} disabled={pending}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
