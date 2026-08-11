import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { LINE_ROLES } from '../expense/expense-line-roles'
import type {
  ExpenseLineRole,
  ExpenseTemplate,
  TemplateFieldPayload,
} from '../finance.types'

const FIELD_TYPES: TemplateFieldPayload['fieldType'][] = [
  'TEXT',
  'NUMBER',
  'CURRENCY',
  'DATE',
  'FILE',
]

const ROLE_LABELS: Record<ExpenseLineRole, string> = {
  LABEL: 'Oznaka',
  QTY: 'Količina',
  UNIT_PRICE: 'Jed. cijena',
  AMOUNT: 'Iznos',
  NONE: '—',
}

type Props = {
  /** When editing an existing template, pass it to list saved fields. */
  template?: ExpenseTemplate | null
  isFixed: boolean
  isPending?: boolean
  draftFields: TemplateFieldPayload[]
  onDraftChange: (fields: TemplateFieldPayload[]) => void
  onAddSaved?: (payload: TemplateFieldPayload) => void
  onRemoveSaved?: (fieldId: string) => void
}

export function CategoryFieldsEditor({
  template,
  isFixed,
  isPending = false,
  draftFields,
  onDraftChange,
  onAddSaved,
  onRemoveSaved,
}: Props) {
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] =
    useState<TemplateFieldPayload['fieldType']>(isFixed ? 'CURRENCY' : 'TEXT')
  const [defaultValue, setDefaultValue] = useState('')
  const [isRequired, setIsRequired] = useState(true)
  const [lineRole, setLineRole] = useState<ExpenseLineRole>(
    isFixed ? 'NONE' : 'LABEL',
  )

  const savedFields = [...(template?.fields ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )

  const resetDraftInputs = () => {
    setFieldName('')
    setDefaultValue('')
    setIsRequired(true)
    setLineRole(isFixed ? 'NONE' : 'LABEL')
    setFieldType(isFixed ? 'CURRENCY' : 'TEXT')
  }

  const handleAdd = () => {
    if (!fieldName.trim()) return
    const payload: TemplateFieldPayload = {
      fieldName: fieldName.trim(),
      fieldType,
      isRequired,
      defaultValue: defaultValue.trim() || undefined,
      lineRole: isFixed ? 'NONE' : lineRole,
    }
    if (template && onAddSaved) {
      onAddSaved(payload)
    } else {
      onDraftChange([...draftFields, payload])
    }
    resetDraftInputs()
  }

  return (
    <div className="grid gap-3">
      <div>
        <Label className="text-sm">
          {isFixed ? 'Fiksna polja (stavke)' : 'Kolone reda'}
        </Label>
        <p className="text-xs text-slate-500">
          {isFixed
            ? 'Npr. PIO, Zdravstvo — sa default iznosom.'
            : 'Npr. Naziv + Količina + Jedinična cijena. Uloga određuje kako se računa total.'}
        </p>
      </div>

      {savedFields.length > 0 ? (
        <ul className="grid gap-1">
          {savedFields.map((field) => (
            <li
              key={field.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-800"
            >
              <span className="flex flex-wrap items-center gap-2">
                {field.fieldName}
                <Badge variant="outline">{field.fieldType}</Badge>
                {!isFixed && field.lineRole && field.lineRole !== 'NONE' ? (
                  <Badge variant="secondary">
                    {ROLE_LABELS[field.lineRole as ExpenseLineRole] ?? field.lineRole}
                  </Badge>
                ) : null}
                {field.defaultValue ? (
                  <Badge variant="secondary">default: {field.defaultValue}</Badge>
                ) : null}
              </span>
              {onRemoveSaved ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ukloni polje ${field.fieldName}`}
                  onClick={() => onRemoveSaved(field.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {!template && draftFields.length > 0 ? (
        <ul className="grid gap-1">
          {draftFields.map((field, index) => (
            <li
              key={`${field.fieldName}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-slate-300 px-2 py-1.5 text-sm dark:border-slate-700"
            >
              <span className="flex flex-wrap items-center gap-2">
                {field.fieldName}
                <Badge variant="outline">{field.fieldType}</Badge>
                {!isFixed && field.lineRole ? (
                  <Badge variant="secondary">
                    {ROLE_LABELS[field.lineRole] ?? field.lineRole}
                  </Badge>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ukloni draft ${field.fieldName}`}
                onClick={() =>
                  onDraftChange(draftFields.filter((_, i) => i !== index))
                }
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]">
        <div className="grid gap-1">
          <Label className="text-xs">Novo polje</Label>
          <Input
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder={isFixed ? 'npr. PIO' : 'npr. Naziv'}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Tip</Label>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={fieldType}
            onChange={(e) =>
              setFieldType(e.target.value as TemplateFieldPayload['fieldType'])
            }
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        {!isFixed ? (
          <div className="grid gap-1">
            <Label className="text-xs">Uloga</Label>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              value={lineRole}
              onChange={(e) => setLineRole(e.target.value as ExpenseLineRole)}
            >
              {LINE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-1">
            <Label className="text-xs">Default</Label>
            <Input
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="121"
              className="w-24"
            />
          </div>
        )}
        <label className="flex h-9 items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
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
