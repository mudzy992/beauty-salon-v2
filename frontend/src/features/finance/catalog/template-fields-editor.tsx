import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import type { ExpenseTemplate, TemplateFieldPayload } from '../finance.types'

const FIELD_TYPES: TemplateFieldPayload['fieldType'][] = [
  'TEXT',
  'NUMBER',
  'CURRENCY',
  'DATE',
  'FILE',
]

type TemplateFieldsEditorProps = {
  template: ExpenseTemplate
  isPending: boolean
  onAdd: (payload: TemplateFieldPayload) => void
  onRemove: (fieldId: string) => void
}

export function TemplateFieldsEditor({
  template,
  isPending,
  onAdd,
  onRemove,
}: TemplateFieldsEditorProps) {
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] =
    useState<TemplateFieldPayload['fieldType']>('TEXT')
  const [isRequired, setIsRequired] = useState(false)

  const handleAdd = () => {
    if (!fieldName.trim()) return
    onAdd({ fieldName: fieldName.trim(), fieldType, isRequired })
    setFieldName('')
    setIsRequired(false)
  }

  const fields = [...(template.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="grid gap-3">
      {fields.length === 0 ? (
        <p className="text-xs text-slate-500">Predložak još nema polja.</p>
      ) : (
        <ul className="grid gap-1">
          {fields.map((field) => (
            <li
              key={field.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-800"
            >
              <span className="flex items-center gap-2">
                {field.fieldName}
                <Badge variant="outline">{field.fieldType}</Badge>
                {field.isRequired ? <Badge variant="secondary">obavezno</Badge> : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ukloni polje ${field.fieldName}`}
                onClick={() => onRemove(field.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid items-end gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="grid gap-1">
          <Label htmlFor={`field-name-${template.id}`} className="text-xs">
            Novo polje
          </Label>
          <Input
            id={`field-name-${template.id}`}
            value={fieldName}
            onChange={(event) => setFieldName(event.target.value)}
            placeholder="Naziv polja"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`field-type-${template.id}`} className="text-xs">
            Tip
          </Label>
          <select
            id={`field-type-${template.id}`}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={fieldType}
            onChange={(event) =>
              setFieldType(event.target.value as TemplateFieldPayload['fieldType'])
            }
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={isRequired}
            onChange={(event) => setIsRequired(event.target.checked)}
          />
          Obavezno
        </label>
        <Button onClick={handleAdd} disabled={isPending || !fieldName.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Dodaj
        </Button>
      </div>
    </div>
  )
}
