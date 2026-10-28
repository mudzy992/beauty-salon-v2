import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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

const FIELD_TYPE_KEYS: Record<TemplateFieldPayload['fieldType'], string> = {
  TEXT: 'finance.expenseCategories.fieldTypes.text',
  NUMBER: 'finance.expenseCategories.fieldTypes.number',
  CURRENCY: 'finance.expenseCategories.fieldTypes.currency',
  DATE: 'finance.expenseCategories.fieldTypes.date',
  FILE: 'finance.expenseCategories.fieldTypes.file',
}

const ROLE_KEYS: Record<ExpenseLineRole, string> = {
  LABEL: 'finance.expenseCategories.roles.label',
  QTY: 'finance.expenseCategories.roles.quantity',
  UNIT_PRICE: 'finance.expenseCategories.roles.unitPrice',
  AMOUNT: 'finance.expenseCategories.roles.amount',
  NONE: 'finance.expenseCategories.roles.none',
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
  const { t } = useTranslation()
  const fieldTypeLabel = (fieldType: string) => {
    const key = FIELD_TYPE_KEYS[fieldType as TemplateFieldPayload['fieldType']]
    return key ? t(key) : fieldType
  }
  const [fieldName, setFieldName] = useState('')
  const [fieldType, setFieldType] = useState<TemplateFieldPayload['fieldType']>(
    isFixed ? 'CURRENCY' : 'TEXT',
  )
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
          {t(
            isFixed
              ? 'finance.expenseCategories.fixedFieldsList'
              : 'finance.expenseCategories.rowColumns',
          )}
        </Label>
        <p className="text-xs text-slate-500">
          {t(
            isFixed
              ? 'finance.expenseCategories.fixedFieldsHint'
              : 'finance.expenseCategories.rowColumnsHint',
          )}
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
                <Badge variant="outline">
                  {fieldTypeLabel(field.fieldType)}
                </Badge>
                {!isFixed && field.lineRole && field.lineRole !== 'NONE' ? (
                  <Badge variant="secondary">
                    {ROLE_KEYS[field.lineRole as ExpenseLineRole]
                      ? t(ROLE_KEYS[field.lineRole as ExpenseLineRole])
                      : field.lineRole}
                  </Badge>
                ) : null}
                {field.defaultValue ? (
                  <Badge variant="secondary">
                    {t('finance.expenseCategories.defaultValue')}:{' '}
                    {field.defaultValue}
                  </Badge>
                ) : null}
              </span>
              {onRemoveSaved ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('finance.expenseCategories.removeField', {
                    name: field.fieldName,
                  })}
                  onClick={() => onRemoveSaved(field.id)}
                  disabled={isPending}
                >
                  <Trash2
                    className="h-3.5 w-3.5 text-rose-500"
                    aria-hidden="true"
                  />
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
                <Badge variant="outline">
                  {t(FIELD_TYPE_KEYS[field.fieldType])}
                </Badge>
                {!isFixed && field.lineRole ? (
                  <Badge variant="secondary">
                    {ROLE_KEYS[field.lineRole]
                      ? t(ROLE_KEYS[field.lineRole])
                      : field.lineRole}
                  </Badge>
                ) : null}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('finance.expenseCategories.removeDraftField', {
                  name: field.fieldName,
                })}
                onClick={() =>
                  onDraftChange(draftFields.filter((_, i) => i !== index))
                }
              >
                <Trash2
                  className="h-3.5 w-3.5 text-rose-500"
                  aria-hidden="true"
                />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]">
        <div className="grid gap-1">
          <Label className="text-xs">
            {t('finance.expenseCategories.newField')}
          </Label>
          <Input
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder={t(
              isFixed
                ? 'finance.expenseCategories.fixedFieldPlaceholder'
                : 'finance.expenseCategories.rowFieldPlaceholder',
            )}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">
            {t('finance.expenseCategories.fieldType')}
          </Label>
          <select
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={fieldType}
            onChange={(e) =>
              setFieldType(e.target.value as TemplateFieldPayload['fieldType'])
            }
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(FIELD_TYPE_KEYS[type])}
              </option>
            ))}
          </select>
        </div>
        {!isFixed ? (
          <div className="grid gap-1">
            <Label className="text-xs">
              {t('finance.expenseCategories.lineRole')}
            </Label>
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              value={lineRole}
              onChange={(e) => setLineRole(e.target.value as ExpenseLineRole)}
            >
              {LINE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_KEYS[role])}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid gap-1">
            <Label className="text-xs">
              {t('finance.expenseCategories.defaultValue')}
            </Label>
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
          {t('finance.expenseCategories.required')}
        </label>
        <Button onClick={handleAdd} disabled={isPending || !fieldName.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('finance.expenseCategories.addField')}
        </Button>
      </div>
    </div>
  )
}
