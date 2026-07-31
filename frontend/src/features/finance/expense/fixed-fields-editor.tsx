import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { findAttachmentForLabel } from './expense-attachment-match'
import { formatMoney, toNumber } from '../finance.utils'
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
  const total = fields.reduce((sum, f) => sum + toNumber(values[f.id]), 0)

  return (
    <div className="grid gap-3">
      <Label>Fiksne stavke</Label>
      <ul className="grid gap-2">
        {fields.map((field) => {
          const pending = attachments[field.id]
          const existing = findAttachmentForLabel(existingAttachments, field.fieldName)
          return (
            <li
              key={field.id}
              className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-50">
                  {field.fieldName}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    className="w-28 text-right"
                    type="number"
                    step="0.01"
                    min={0}
                    aria-label={`Iznos ${field.fieldName}`}
                    value={values[field.id] ?? ''}
                    onChange={(e) => onValueChange(field.id, e.target.value)}
                  />
                  <span className="text-xs text-slate-500">KM</span>
                </div>
              </div>
              {requiresPerItem ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">Prilog:</span>
                  {pending ? (
                    <>
                      <Badge variant="secondary">{pending.name}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onClearPending(field.id)}
                      >
                        Ukloni
                      </Button>
                    </>
                  ) : existing ? (
                    <Badge variant="outline">
                      {existing.upload?.originalName ?? 'postojeći'}
                    </Badge>
                  ) : (
                    <input
                      type="file"
                      className="max-w-full text-xs"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) onUpload(field.id, field.fieldName, file)
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
      <div className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
        <span className="text-slate-500">Ukupno</span>
        <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
      </div>
    </div>
  )
}
