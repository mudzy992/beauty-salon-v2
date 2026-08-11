import { useEffect, useMemo, useState } from 'react'

import { findAttachmentForLabel } from './expense-attachment-match'
import {
  emptyExpenseForm,
  formFromCategory,
  formFromExpense,
  type ExpenseFormState,
} from './expense-form-state'
import { sumLineItems } from './expenses.helpers'
import { serializeExpenseNotes } from './expense-notes'
import { labelFromLineValues } from './expense-line-roles'
import { toNumber } from '../finance.utils'
import type {
  Expense,
  ExpenseCategory,
  ExpensePayload,
  LineItem,
  TemplateField,
} from '../finance.types'

export type { ExpenseFormState, PendingAtt } from './expense-form-state'

export const useExpenseForm = (params: {
  open: boolean
  bookId: string
  editing: Expense | null
  categories: ExpenseCategory[]
}) => {
  const [form, setForm] = useState<ExpenseFormState>(emptyExpenseForm)

  useEffect(() => {
    if (!params.open) return
    if (!params.editing) {
      setForm(emptyExpenseForm())
      return
    }
    const category =
      params.categories.find((c) => c.id === params.editing?.category?.id) ??
      params.editing.category ??
      null
    setForm(formFromExpense(params.editing, category))
  }, [params.open, params.editing, params.categories])

  const category = useMemo(
    () => params.categories.find((c) => c.id === form.categoryId) ?? null,
    [params.categories, form.categoryId],
  )
  const isFixed = Boolean(category?.isFixed)
  const requiresPerItem = Boolean(category?.template?.requiresAttachmentPerItem)
  const templateFields: TemplateField[] = useMemo(
    () => [...(category?.template?.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [category],
  )

  const fixedTotal = templateFields.reduce(
    (sum, field) => sum + toNumber(form.fieldValues[field.id]),
    0,
  )
  const lineItemsTotal = sumLineItems(form.lineItems, templateFields)
  const effectiveTotal = isFixed
    ? fixedTotal
    : form.lineItems.length > 0
      ? lineItemsTotal
      : Number(form.totalAmount || 0)

  const update = (patch: Partial<ExpenseFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const selectCategory = (categoryId: string) => {
    const next = params.categories.find((c) => c.id === categoryId)
    setForm(next ? formFromCategory(next) : emptyExpenseForm())
  }

  const setFieldValue = (fieldId: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      fieldValues: { ...prev.fieldValues, [fieldId]: value },
    }))

  const setLineItems = (lineItems: LineItem[]) =>
    setForm((prev) => ({
      ...prev,
      lineItems,
      lineAttachments: lineItems.map((_, i) => prev.lineAttachments[i] ?? null),
    }))

  const validationError = (() => {
    if (!form.categoryId) return 'Odaberite kategoriju.'
    if (!form.title.trim()) return 'Naziv je obavezan.'
    if (!Number.isFinite(effectiveTotal) || effectiveTotal <= 0) {
      return 'Iznos mora biti veći od nule.'
    }
    if (isFixed) {
      const missing = templateFields.filter((f) => !(form.fieldValues[f.id] ?? '').trim())
      if (missing.length) {
        return `Nedostaju vrijednosti: ${missing.map((f) => f.fieldName).join(', ')}.`
      }
      if (requiresPerItem) {
        const noAtt = templateFields.filter(
          (f) =>
            !form.fieldAttachments[f.id] &&
            !findAttachmentForLabel(params.editing?.attachments, f.fieldName),
        )
        if (noAtt.length) {
          return `Dodajte prilog za: ${noAtt.map((f) => f.fieldName).join(', ')}.`
        }
      }
    } else {
      if (templateFields.length === 0) {
        return 'Kategorija nema kolona — uredite kategoriju.'
      }
      const incomplete = form.lineItems.filter((item) => {
        const requiredMissing = templateFields.some(
          (f) => f.isRequired && !(item.values[f.id] ?? '').trim(),
        )
        return requiredMissing || !labelFromLineValues(templateFields, item.values)
      })
      if (form.lineItems.length === 0 || incomplete.length === form.lineItems.length) {
        return 'Dodajte barem jednu popunjenu stavku.'
      }
      if (incomplete.length) return 'Popunite obavezna polja na svim stavkama.'
      if (requiresPerItem) {
        const noAtt = form.lineItems.filter((item, i) => {
          const label = labelFromLineValues(templateFields, item.values)
          return (
            label &&
            !form.lineAttachments[i] &&
            !findAttachmentForLabel(params.editing?.attachments, label)
          )
        })
        if (noAtt.length) return 'Dodajte prilog uz svaku stavku.'
      }
    }
    return null
  })()

  const toPayload = (bulkUploadIds: string[]): ExpensePayload => {
    const perItem = isFixed
      ? Object.values(form.fieldAttachments).map((a) => a.uploadId)
      : form.lineAttachments.filter(Boolean).map((a) => a!.uploadId)
    const attachmentUploadIds = [...bulkUploadIds, ...perItem]
    return {
      bookId: params.bookId,
      categoryId: form.categoryId,
      title: form.title.trim(),
      totalAmount: effectiveTotal,
      notes: isFixed
        ? form.notes.trim() || undefined
        : serializeExpenseNotes({ lineItems: form.lineItems, userNotes: form.notes }),
      fieldValues: isFixed
        ? templateFields.map((f) => ({
            fieldId: f.id,
            value: (form.fieldValues[f.id] ?? '').trim(),
          }))
        : undefined,
      attachmentUploadIds: attachmentUploadIds.length ? attachmentUploadIds : undefined,
    }
  }

  return {
    form,
    update,
    selectCategory,
    setFieldValue,
    setLineItems,
    category,
    isFixed,
    requiresPerItem,
    templateFields,
    lineItemsTotal,
    effectiveTotal,
    validationError,
    toPayload,
  }
}
