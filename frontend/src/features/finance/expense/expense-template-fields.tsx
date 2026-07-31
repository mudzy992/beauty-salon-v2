import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import type { TemplateField } from '../finance.types'

type Props = {
  fields: TemplateField[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
}

const inputTypeForField = (fieldType: string): string => {
  if (fieldType === 'NUMBER' || fieldType === 'CURRENCY') return 'number'
  if (fieldType === 'DATE') return 'date'
  return 'text'
}

export function ExpenseTemplateFields({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null
  return (
    <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <legend className="px-1 text-xs font-medium text-slate-500">
        Polja predloška
      </legend>
      {fields.map((field) => (
        <div key={field.id} className="grid gap-1">
          <Label htmlFor={`field-${field.id}`}>
            {field.fieldName}
            {field.isRequired ? (
              <span className="ml-1 text-rose-500" aria-hidden="true">
                *
              </span>
            ) : null}
          </Label>
          <Input
            id={`field-${field.id}`}
            type={inputTypeForField(field.fieldType)}
            required={field.isRequired}
            value={values[field.id] ?? ''}
            onChange={(event) => onChange(field.id, event.target.value)}
          />
        </div>
      ))}
    </fieldset>
  )
}
