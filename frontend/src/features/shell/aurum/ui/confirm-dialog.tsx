import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../components/ui/button'
import { Label } from '../../../../components/ui/label'
import { Textarea } from '../../../../components/ui/textarea'
// Radix semantika (DialogTitle/Description, fokus unutra i povratak na okidač)
// ostaje dijeljena s postojećim šablonom do S11; ovdje se ne duplicira.
import { ResponsiveDialog } from '../../admin/ui/responsive-dialog'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  isDestructive?: boolean
  isPending?: boolean
  reasonLabel?: string
  minReasonLength?: number
  onConfirm: (reason: string) => void
}

/**
 * NEJRA §11 — potvrda prije destruktivne radnje, busy stanje, tekstualni razlog,
 * `aria-describedby` + `aria-invalid` uz polje. Fokus se ne otima: Radix ga vraća
 * na okidač pri zatvaranju.
 */
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
  const reasonId = useId()
  const reasonHintId = useId()
  const [reason, setReason] = useState('')
  const confirmInFlightRef = useRef(false)
  const requiresReason = Boolean(reasonLabel)
  const isReasonValid = !requiresReason || reason.trim().length >= minReasonLength

  useEffect(() => {
    if (!open) {
      confirmInFlightRef.current = false
      setReason('')
    }
  }, [open])

  const handleConfirm = () => {
    if (isPending || !isReasonValid || confirmInFlightRef.current) return
    confirmInFlightRef.current = true
    onConfirm(reason.trim())
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      confirmInFlightRef.current = false
      setReason('')
    }
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
          {isPending ? (
            <p role="status" aria-live="polite" className="sr-only">
              {t('common.loading')}
            </p>
          ) : null}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {t('finance.confirm.cancel')}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isPending || !isReasonValid || confirmInFlightRef.current}
            aria-busy={isPending}
          >
            {isPending ? t('finance.confirm.processing') : (confirmLabel ?? t('finance.confirm.confirm'))}
          </Button>
        </div>
      }
    >
      {requiresReason ? (
        <div className="space-y-2">
          <Label htmlFor={reasonId}>{reasonLabel}</Label>
          <Textarea
            id={reasonId}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t('finance.confirm.reasonPlaceholder', { count: minReasonLength })}
            aria-describedby={reasonHintId}
            aria-invalid={reason.length > 0 && !isReasonValid}
          />
          <p id={reasonHintId} className="text-xs text-content-muted">
            {t('finance.confirm.reasonHistory')}
          </p>
        </div>
      ) : null}
    </ResponsiveDialog>
  )
}
