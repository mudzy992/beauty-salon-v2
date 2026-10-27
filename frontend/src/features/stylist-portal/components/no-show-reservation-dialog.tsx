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
  const { t } = useTranslation()
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
          <DialogTitle>{t('stylistPortal.reservationDialogs.noShow.title')}</DialogTitle>
          <DialogDescription>
            {t('stylistPortal.reservationDialogs.noShow.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="noShowReason">{t('stylistPortal.reservationDialogs.noShow.reason')}</Label>
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
            {t('stylistPortal.reservationDialogs.noShow.penalty', {
              state: applyPenalty ? t('common.yes') : t('common.no'),
            })}
          </Button>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('stylistPortal.reservationDialogs.noShow.applyPenaltyDescription')}
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm(reason, applyPenalty)}
            disabled={pending}
          >
            {t('stylistPortal.reservationDialogs.noShow.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
