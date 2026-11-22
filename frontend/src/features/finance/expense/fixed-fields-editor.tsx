import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { findAttachmentForLabel } from './expense-attachment-match'
import { toNumber } from '../finance.utils'
import type { ExpenseAttachment, TemplateField } from '../finance.types'
import type { PendingAtt } from './expense-form-state'

type Props = {
  fields: TemplateField[]
  values: Record<string, string>
  attachments: Record<string, PendingAtt>
  existingAttachments: ExpenseAttachment[]
  requiresPerItem: boolean
  isUploading: boolean
  onValueChange: (fieldId: string, value: string) => void
  onUpload: (fieldId: string, fieldName: string, file: File) => void
  onClearPending: (fieldId: string) => void
}

export function FixedFieldsEditor({
  fields,
  values,
  attachments,
  existingAttachments,
  requiresPerItem,
  isUploading,
  onValueChange,
  onUpload,
  onClearPending,
}: Props) {
  const { t, i18n } = useTranslation()
  const uploadRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const clearRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const uploadFocus = useRef<{ fieldId: string; dialog: Element | null } | null>(null)
  useEffect(() => {
    if (isUploading || !uploadFocus.current) return
    const { fieldId, dialog } = uploadFocus.current
    uploadFocus.current = null
    // A disabled or replaced input may lose focus. Respect intentional moves.
    if (document.activeElement === document.body || document.activeElement === dialog) {
      ;(clearRefs.current[fieldId] ?? uploadRefs.current[fieldId])?.focus()
    }
  }, [isUploading, attachments])
  const total = fields.reduce((sum, f) => sum + toNumber(values[f.id]), 0)

  return (
    <div className="grid gap-3">
      <Label>{t('finance.expenseForm.fixedFields')}</Label>
      <ul className="grid gap-2">
        {fields.map((field) => {
          const pending = attachments[field.id]
          const existing = findAttachmentForLabel(existingAttachments, field.fieldName)
          return (
            <li
              key={field.id}
              className="rounded-md border border-line p-3 "
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-content">
                  {field.fieldName}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-28 text-right"
                    type="number"
                    step="0.01"
                    min={0}
                    aria-label={t('finance.expenseForm.fieldAmount', { name: field.fieldName })}
                    value={values[field.id] ?? ''}
                    onChange={(e) => onValueChange(field.id, e.target.value)}
                  />
                  <span className="text-xs text-content-strong">KM</span>
                </div>
              </div>
              {requiresPerItem ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-content-strong">{t('finance.expenseForm.attachment')}:</span>
                  {pending ? (
                    <>
                      <Badge variant="secondary">{pending.name}</Badge>
                      <Button
                        ref={(element) => { clearRefs.current[field.id] = element }}
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={t('finance.expenseForm.removeFieldAttachment', { name: field.fieldName })}
                        disabled={isUploading}
                        onClick={(event) => {
                          if (document.activeElement === event.currentTarget) {
                            uploadFocus.current = { fieldId: field.id, dialog: event.currentTarget.closest('[role="dialog"]') }
                          }
                          onClearPending(field.id)
                        }}
                      >
                        {t('finance.expenseForm.remove')}
                      </Button>
                    </>
                  ) : existing ? (
                    <Badge variant="outline">
                      {existing.upload?.originalName ?? t('finance.expenseForm.existingAttachment')}
                    </Badge>
                  ) : (
                    <input
                      ref={(element) => { uploadRefs.current[field.id] = element }}
                      type="file"
                      className="max-w-full text-xs"
                      aria-label={t('finance.expenseForm.attachmentFor', { name: field.fieldName })}
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (document.activeElement === e.currentTarget) {
                            uploadFocus.current = { fieldId: field.id, dialog: e.currentTarget.closest('[role="dialog"]') }
                          }
                          onUpload(field.id, field.fieldName, file)
                        }
                        e.target.value = ''
                      }}
                    />
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div className="flex justify-between rounded-md bg-surface-muted px-3 py-2 text-sm">
        <span className="text-content-strong">{t('finance.expenseForm.total')}</span>
        <span className="font-semibold tabular-nums">
          {formatLocalizedAmount(total, i18n.language)}
        </span>
      </div>
    </div>
  )
}
