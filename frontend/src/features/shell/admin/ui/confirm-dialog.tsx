import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../../components/ui/button'
import { Label } from '../../../../components/ui/label'
import { Textarea } from '../../../../components/ui/textarea'
import { ResponsiveDialog } from './responsive-dialog'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  isDestructive?: boolean
  isPending?: boolean
  blockedReason?: string
  /** Kada je postavljeno, potvrda traži tekstualni razlog. */
  reasonLabel?: string
  minReasonLength?: number
  onConfirm: (reason: string) => void
  onOpenAutoFocus?: (event: Event) => void
  onCloseAutoFocus?: (event: Event) => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isDestructive = false,
  isPending = false,
  blockedReason,
  reasonLabel,
  minReasonLength = 3,
  onConfirm,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const confirmInFlightRef = useRef(false)
  const wasPending = useRef(false)
  const [confirmLocked, setConfirmLocked] = useState(false)
  const requiresReason = Boolean(reasonLabel)
  const isReasonValid =
    !requiresReason || reason.trim().length >= minReasonLength

  useEffect(() => {
    if (!open) {
      confirmInFlightRef.current = false
      wasPending.current = false
      setConfirmLocked(false)
      setReason('')
    }
  }, [open])

  // When a mutation fails while the dialog stays open, allow another attempt.
  useEffect(() => {
    if (wasPending.current && !isPending) {
      confirmInFlightRef.current = false
      setConfirmLocked(false)
    }
    wasPending.current = isPending
  }, [isPending])

  const handleConfirm = () => {
    if (isPending || blockedReason || !isReasonValid || confirmInFlightRef.current) return
    confirmInFlightRef.current = true
    setConfirmLocked(true)
    onConfirm(reason.trim())
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      confirmInFlightRef.current = false
      wasPending.current = false
      setConfirmLocked(false)
      setReason('')
    }
    onOpenChange(next)
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={onCloseAutoFocus}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t('finance.confirm.cancel')}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'danger' : 'default'}
            onClick={handleConfirm}
            disabled={isPending || !isReasonValid || confirmLocked}
            aria-disabled={blockedReason ? true : undefined}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            aria-busy={isPending}
          >
            {isPending
              ? t('finance.confirm.processing')
              : (confirmLabel ?? t('finance.confirm.confirm'))}
          </Button>
        </div>
      }
    >
      {blockedReason ? <p role="alert" className="text-sm text-content-strong">{blockedReason}</p> : null}
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
          <p className="text-xs text-content-strong ">
            {t('finance.confirm.reasonHistory')}
          </p>
        </div>
      ) : null}
    </ResponsiveDialog>
  )
}
