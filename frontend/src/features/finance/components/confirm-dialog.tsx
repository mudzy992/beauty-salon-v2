import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  confirmLabel,
  isDestructive = false,
  isPending = false,
  reasonLabel,
  minReasonLength = 3,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const requiresReason = Boolean(reasonLabel)
  const isReasonValid =
    !requiresReason || reason.trim().length >= minReasonLength

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
            {t('finance.confirm.cancel')}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={() => onConfirm(reason.trim())}
            disabled={isPending || !isReasonValid}
          >
            {isPending
              ? t('finance.confirm.processing')
              : (confirmLabel ?? t('finance.confirm.confirm'))}
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
            placeholder={t('finance.confirm.reasonPlaceholder', {
              count: minReasonLength,
            })}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('finance.confirm.reasonHistory')}
          </p>
        </div>
      ) : null}
    </ResponsiveDialog>
  )
}
