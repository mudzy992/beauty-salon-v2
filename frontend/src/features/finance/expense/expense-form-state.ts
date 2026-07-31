import type { Expense, ExpenseCategory, LineItem } from '../finance.types'
import { createEmptyLineItem } from './expenses.helpers'
import { parseExpenseNotes } from './expense-notes'
import { toNumber } from '../finance.utils'

export type PendingAtt = { uploadId: string; name: string }

export type ExpenseFormState = {
  categoryId: string
  title: string
  totalAmount: string
  notes: string
  fieldValues: Record<string, string>
  lineItems: LineItem[]
  fieldAttachments: Record<string, PendingAtt>
  lineAttachments: (PendingAtt | null)[]
}

export const emptyExpenseForm = (): ExpenseFormState => ({
  categoryId: '',
  title: '',
  totalAmount: '',
  notes: '',
  fieldValues: {},
  lineItems: [],
  fieldAttachments: {},
  lineAttachments: [],
})

export const formFromExpense = (
  expense: Expense,
  category: ExpenseCategory | null,
): ExpenseFormState => {
  const isFixed = Boolean(category?.isFixed ?? expense.category?.isFixed)
  if (isFixed) {
    return {
      ...emptyExpenseForm(),
      categoryId: expense.category?.id ?? '',
      title: expense.title,
      totalAmount: String(toNumber(expense.totalAmount)),
      notes: expense.notes ?? '',
      fieldValues: Object.fromEntries(
        (expense.fieldValues ?? []).map((fv) => [fv.fieldId, fv.value]),
      ),
    }
  }
  const parsed = parseExpenseNotes(expense.notes)
  const lineItems: LineItem[] =
    parsed.lineItems.length > 0 ? parsed.lineItems : [createEmptyLineItem()]
  return {
    ...emptyExpenseForm(),
    categoryId: expense.category?.id ?? '',
    title: expense.title,
    totalAmount: String(toNumber(expense.totalAmount)),
    notes: parsed.userNotes,
    lineItems,
    lineAttachments: lineItems.map(() => null),
  }
}

export const formFromCategory = (category: ExpenseCategory): ExpenseFormState => {
  const fields = [...(category.template?.fields ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  if (category.isFixed) {
    return {
      ...emptyExpenseForm(),
      categoryId: category.id,
      title: category.name,
      fieldValues: Object.fromEntries(fields.map((f) => [f.id, f.defaultValue ?? ''])),
    }
  }
  return {
    ...emptyExpenseForm(),
    categoryId: category.id,
    title: category.name,
    lineItems: [createEmptyLineItem()],
    lineAttachments: [null],
  }
}
