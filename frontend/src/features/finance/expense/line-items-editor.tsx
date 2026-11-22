import { useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { createEmptyLineItem, sumLineItems } from './expenses.helpers'
import { findAttachmentForLabel } from './expense-attachment-match'
import {
  computeLineTotal,
  labelFromLineValues,
} from './expense-line-roles'
import { toNumber } from '../finance.utils'
import type {
  ExpenseAttachment,
  LineItem,
  TemplateField,
} from '../finance.types'
import type { PendingAtt } from './expense-form-state'

type Props = {
  fields: TemplateField[]
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  onRemove: (index: number) => void
  requiresPerItem?: boolean
  lineAttachments?: (PendingAtt | null)[]
  existingAttachments?: ExpenseAttachment[]
  isUploading?: boolean
  onUploadItem?: (index: number, label: string, file: File) => void
  onClearItemAttachment?: (index: number) => void
}

const inputType = (fieldType: string): string =>
  fieldType === 'NUMBER' || fieldType === 'CURRENCY' ? 'number' : 'text'

export function LineItemsEditor({
  fields,
  items,
  onChange,
  onRemove,
  requiresPerItem = false,
  lineAttachments = [],
  existingAttachments = [],
  isUploading = false,
  onUploadItem,
  onClearItemAttachment,
}: Props) {
  const { t, i18n } = useTranslation()
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const uploadRefs = useRef<Record<number, HTMLInputElement | null>>({})
  const clearRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const uploadFocus = useRef<{ index: number; dialog: Element | null } | null>(null)
  useEffect(() => {
    if (isUploading || !uploadFocus.current) return
    const { index, dialog } = uploadFocus.current
    uploadFocus.current = null
    // The file input can be disabled or replaced by the remove button. Do not
    // override a focus move made by the user while the upload was pending.
    if (document.activeElement === document.body || document.activeElement === dialog) {
      ;(clearRefs.current[index] ?? uploadRefs.current[index])?.focus()
    }
  }, [isUploading, lineAttachments])
  const updateValue = (index: number, fieldId: string, value: string) =>
    onChange(
      items.map((item, i) =>
        i === index
          ? { values: { ...item.values, [fieldId]: value } }
          : item,
      ),
    )

  if (fields.length === 0) {
    return (
      <p className="text-xs text-amber-700 dark:text-amber-400" role="alert">
        {t('finance.expenseForm.categoryHasNoColumnsHint')}
      </p>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{t('finance.expenseForm.lineItems')}</Label>
        <Button
          ref={addButtonRef}
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => onChange([...items, createEmptyLineItem(fields)])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.expenseForm.addLineItem')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-content-strong">{t('finance.expenseForm.noLineItemsHint')}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, index) => {
            const label = labelFromLineValues(fields, item.values)
            const pending = lineAttachments[index]
            const existing = findAttachmentForLabel(existingAttachments, label)
            return (
              <li
                key={index}
                className="grid gap-2 rounded-md border border-line p-2 "
              >
                <div className="flex flex-wrap items-end gap-2">
                  {fields.map((field) => (
                    <div key={field.id} className="min-w-[5.5rem] flex-1 grid gap-1">
                      <Label htmlFor={`item-${index}-${field.id}`} className="text-xs">
                        {field.fieldName}
                      </Label>
                      <Input
                        id={`item-${index}-${field.id}`}
                        type={inputType(field.fieldType)}
                        min={inputType(field.fieldType) === 'number' ? 0 : undefined}
                        step={field.fieldType === 'CURRENCY' ? '0.01' : undefined}
                        value={item.values[field.id] ?? ''}
                        onChange={(e) =>
                          updateValue(
                            index,
                            field.id,
                            inputType(field.fieldType) === 'number'
                              ? String(toNumber(e.target.value))
                              : e.target.value,
                          )
                        }
                      />
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('finance.expenseForm.removeLineItem', { number: index + 1 })}
                    disabled={isUploading}
                    onClick={(event) => {
                      if (document.activeElement === event.currentTarget) addButtonRef.current?.focus()
                      onRemove(index)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex justify-between text-xs text-content-strong">
                  <span>{t('finance.expenseForm.lineTotal')}</span>
                  <span className="tabular-nums font-medium text-content">
                    {formatLocalizedAmount(computeLineTotal(fields, item.values), i18n.language)}
                  </span>
                </div>
                {requiresPerItem ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-content-strong">{t('finance.expenseForm.attachment')}:</span>
                    {pending ? (
                      <>
                        <Badge variant="secondary">{pending.name}</Badge>
                        <Button
                          ref={(element) => { clearRefs.current[index] = element }}
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isUploading}
                          onClick={(event) => {
                            if (document.activeElement === event.currentTarget) {
                              uploadFocus.current = { index, dialog: event.currentTarget.closest('[role="dialog"]') }
                            }
                            onClearItemAttachment?.(index)
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
                        ref={(element) => { uploadRefs.current[index] = element }}
                        type="file"
                        className="max-w-full text-xs"
                        aria-label={t('finance.expenseForm.attachmentForLine', { number: index + 1 })}
                        disabled={isUploading || !label}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file && onUploadItem) {
                            if (document.activeElement === e.currentTarget) {
                              uploadFocus.current = { index, dialog: e.currentTarget.closest('[role="dialog"]') }
                            }
                            onUploadItem(index, label, file)
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
      )}

      {items.length > 0 ? (
        <div className="flex justify-between rounded-md bg-surface-muted px-3 py-2 text-sm">
          <span className="text-content-strong">{t('finance.expenseForm.lineItemsTotal')}</span>
          <span className="font-semibold tabular-nums">
            {formatLocalizedAmount(sumLineItems(items, fields), i18n.language)}
          </span>
        </div>
      ) : null}
    </div>
  )
}
