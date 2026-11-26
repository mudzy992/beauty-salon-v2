import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'

type StylistDebtRepaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  onDateChange: (date: string) => void
  note: string
  onNoteChange: (note: string) => void
  pending: boolean
  onSubmit: () => void
}

export const StylistDebtRepaymentDialog = ({
  open,
  onOpenChange,
  date,
  onDateChange,
  note,
  onNoteChange,
  pending,
  onSubmit,
}: StylistDebtRepaymentDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistPortal.debts.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('stylistPortal.debts.dialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="repayDate">{t('common.date')}</Label>
            <Input id="repayDate" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repayNote">{t('stylistPortal.debts.noteOptional')}</Label>
            <Input id="repayNote" value={note} onChange={(event) => onNoteChange(event.target.value)} />
          </div>
        </div>
        {pending ? (
          <p role="status" aria-live="polite" className="text-sm text-content-muted">
            {t('common.loading')}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSubmit} disabled={pending} aria-busy={pending}>
            {t('stylistPortal.debts.confirmRepayment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
