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
  requiresPerItem = false,
  lineAttachments = [],
  existingAttachments = [],
  isUploading = false,
  onUploadItem,
  onClearItemAttachment,
}: Props) {
  const { t, i18n } = useTranslation()
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
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, createEmptyLineItem(fields)])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.expenseForm.addLineItem')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">{t('finance.expenseForm.noLineItemsHint')}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, index) => {
            const label = labelFromLineValues(fields, item.values)
            const pending = lineAttachments[index]
            const existing = findAttachmentForLabel(existingAttachments, label)
            return (
              <li
                key={index}
                className="grid gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800"
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
                    onClick={() => onChange(items.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                  </Button>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{t('finance.expenseForm.lineTotal')}</span>
                  <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">
                    {formatLocalizedAmount(computeLineTotal(fields, item.values), i18n.language)}
                  </span>
                </div>
                {requiresPerItem ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-500">{t('finance.expenseForm.attachment')}:</span>
                    {pending ? (
                      <>
                        <Badge variant="secondary">{pending.name}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onClearItemAttachment?.(index)}
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
                        type="file"
                        className="max-w-full text-xs"
                        disabled={isUploading || !label}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onUploadItem?.(index, label, file)
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
        <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
          <span className="text-slate-500">{t('finance.expenseForm.lineItemsTotal')}</span>
          <span className="font-semibold tabular-nums">
            {formatLocalizedAmount(sumLineItems(items, fields), i18n.language)}
          </span>
        </div>
      ) : null}
    </div>
  )
}
