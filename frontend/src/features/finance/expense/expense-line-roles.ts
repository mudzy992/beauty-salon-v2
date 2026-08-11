import type { ExpenseLineRole, LineItem, TemplateField } from '../finance.types'
import { toNumber } from '../finance.utils'

export const LINE_ROLES: ExpenseLineRole[] = [
  'LABEL',
  'QTY',
  'UNIT_PRICE',
  'AMOUNT',
  'NONE',
]

export const normalizeLineRole = (
  role: string | null | undefined,
): ExpenseLineRole =>
  LINE_ROLES.includes(role as ExpenseLineRole)
    ? (role as ExpenseLineRole)
    : 'NONE'

export const fieldByRole = (
  fields: TemplateField[],
  role: ExpenseLineRole,
): TemplateField | undefined =>
  fields.find((f) => normalizeLineRole(f.lineRole) === role)

export const computeLineTotal = (
  fields: TemplateField[],
  values: Record<string, string>,
): number => {
  const qty = fieldByRole(fields, 'QTY')
  const unit = fieldByRole(fields, 'UNIT_PRICE')
  const amount = fieldByRole(fields, 'AMOUNT')
  if (qty && unit) return toNumber(values[qty.id]) * toNumber(values[unit.id])
  if (amount) return toNumber(values[amount.id])
  return fields
    .filter((f) => f.fieldType === 'CURRENCY')
    .reduce((sum, f) => sum + toNumber(values[f.id]), 0)
}

export const computeLinesTotal = (
  fields: TemplateField[],
  items: LineItem[],
): number => items.reduce((sum, item) => sum + computeLineTotal(fields, item.values), 0)

export const labelFromLineValues = (
  fields: TemplateField[],
  values: Record<string, string>,
): string => {
  const label = fieldByRole(fields, 'LABEL')
  if (label) return (values[label.id] ?? '').trim()
  const text = fields.find((f) => f.fieldType === 'TEXT')
  if (text) return (values[text.id] ?? '').trim()
  return Object.values(values).find((v) => v.trim())?.trim() ?? ''
}

export const createEmptyModularLine = (fields: TemplateField[]): LineItem => ({
  values: Object.fromEntries(fields.map((f) => [f.id, f.defaultValue ?? ''])),
})
