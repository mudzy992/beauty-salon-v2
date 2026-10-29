import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { DailyLogEntry } from './types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyLogEntry | null
  reason: string
  onReasonChange: (value: string) => void
  saving: boolean
  onConfirm: () => void
}

export const DailyLogDeleteDialog = ({
  open,
  onOpenChange,
  entry,
  reason,
  onReasonChange,
  saving,
  onConfirm,
}: Props) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dailyLog.deleteDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p>{t('dailyLog.deleteDialog.description')}</p>
          {entry?.status === 'COMPLETED' ? (
            <p>{t('dailyLog.deleteDialog.completedWarning')}</p>
          ) : null}
          {entry?.status === 'COMPLETED' && entry.reservation ? (
            <p>{t('dailyLog.deleteDialog.reservationWarning')}</p>
          ) : null}
        </div>
        <div>
          <Label>{t('dailyLog.deleteDialog.reasonLabel')}</Label>
          <Textarea
            className="mt-1"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            placeholder={t('dailyLog.deleteDialog.reasonPlaceholder')}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={saving || !reason.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('dailyLog.deleteDialog.deleting')}
              </>
            ) : (
              t('common.delete')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
