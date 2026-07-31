import { useEffect, useMemo, useState } from 'react'

import { sumLineItems } from './expenses.helpers'
import { toNumber } from '../finance.utils'
import type {
  Expense,
  ExpenseCategory,
  ExpensePayload,
  LineItem,
  TemplateField,
} from '../finance.types'

export type ExpenseFormState = {
  categoryId: string
  title: string
  totalAmount: string
  notes: string
  fieldValues: Record<string, string>
  lineItems: LineItem[]
}

const emptyForm = (): ExpenseFormState => ({
  categoryId: '',
  title: '',
  totalAmount: '',
  notes: '',
  fieldValues: {},
  lineItems: [],
})

const toFormState = (expense: Expense): ExpenseFormState => ({
  categoryId: expense.category?.id ?? '',
  title: expense.title,
  totalAmount: String(toNumber(expense.totalAmount)),
  notes: expense.notes ?? '',
  fieldValues: Object.fromEntries(
    (expense.fieldValues ?? []).map((fv) => [fv.fieldId, fv.value]),
  ),
  lineItems: [],
})

export const useExpenseForm = (params: {
  open: boolean
  bookId: string
  editing: Expense | null
  categories: ExpenseCategory[]
}) => {
  const [form, setForm] = useState<ExpenseFormState>(emptyForm)

  useEffect(() => {
    if (!params.open) return
    setForm(params.editing ? toFormState(params.editing) : emptyForm())
  }, [params.open, params.editing])

  const category = useMemo(
    () => params.categories.find((c) => c.id === form.categoryId) ?? null,
    [params.categories, form.categoryId],
  )
  const templateFields: TemplateField[] = useMemo(
    () => [...(category?.template?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [category],
  )

  const lineItemsTotal = sumLineItems(form.lineItems)
  const effectiveTotal =
    form.lineItems.length > 0 ? lineItemsTotal : Number(form.totalAmount || 0)

  const update = (patch: Partial<ExpenseFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const setFieldValue = (fieldId: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      fieldValues: { ...prev.fieldValues, [fieldId]: value },
    }))

  const missingRequired = templateFields.filter(
    (field) => field.isRequired && !(form.fieldValues[field.id] ?? '').trim(),
  )

  const validationError = (() => {
    if (!form.categoryId) return 'Odaberite kategoriju.'
    if (!form.title.trim()) return 'Naziv je obavezan.'
    if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
      return 'Iznos mora biti veći od nule.'
    }
    if (missingRequired.length > 0) {
      return `Nedostaju obavezna polja: ${missingRequired
        .map((f) => f.fieldName)
        .join(', ')}.`
    }
    return null
  })()

  const toPayload = (attachmentUploadIds: string[]): ExpensePayload => {
    const itemsNote = form.lineItems
      .filter((item) => item.name.trim())
      .map((item) => `${item.name} × ${item.qty} @ ${item.price}`)
      .join('; ')
    const notes = [form.notes.trim(), itemsNote].filter(Boolean).join(' | ')
    return {
      bookId: params.bookId,
      categoryId: form.categoryId,
      title: form.title.trim(),
      totalAmount: effectiveTotal,
      notes: notes || undefined,
      fieldValues: templateFields
        .map((field) => ({
          fieldId: field.id,
          value: (form.fieldValues[field.id] ?? '').trim(),
        }))
        .filter((fv) => fv.value !== ''),
      attachmentUploadIds: attachmentUploadIds.length
        ? attachmentUploadIds
        : undefined,
    }
  }

  return {
    form,
    update,
    setFieldValue,
    category,
    templateFields,
    lineItemsTotal,
    effectiveTotal,
    validationError,
    toPayload,
  }
}
