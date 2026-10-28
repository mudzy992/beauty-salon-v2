import { formatExpenseNotesSummary, parseExpenseNotes } from './expense-notes'
import { toNumber } from '../finance.utils'
import type { Expense } from '../finance.types'

export const PREVIEW_LIMIT = 3

export const detailLabelsFor = (expense: Expense, fieldFallback = 'Polje'): string[] => {
  if (expense.category?.isFixed) {
    return (expense.fieldValues ?? []).map((fv) => {
      const name = fv.field?.fieldName ?? fieldFallback
      return `${name}: ${toNumber(fv.value).toFixed(2)} KM`
    })
  }
  const fields = expense.category?.template?.fields ?? []
  return formatExpenseNotesSummary(expense.notes, fields).lineLabels
}

export const hasInvoiceDetail = (expense: Expense): boolean => {
  if (expense.category?.isFixed) return (expense.fieldValues ?? []).length > 0
  const fields = expense.category?.template?.fields ?? []
  return parseExpenseNotes(expense.notes, fields).lineItems.length > 0
}

export const notesPreviewFor = (expense: Expense): string => {
  if (expense.category?.isFixed) return expense.notes ?? ''
  const fields = expense.category?.template?.fields ?? []
  return formatExpenseNotesSummary(expense.notes, fields).userNotes
}
