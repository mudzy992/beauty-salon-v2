import { formatExpenseNotesSummary, parseExpenseNotes } from './expense-notes'
import { toNumber } from '../finance.utils'
import type { Expense } from '../finance.types'

export const PREVIEW_LIMIT = 3

export const detailLabelsFor = (expense: Expense): string[] => {
  if (expense.category?.isFixed) {
    return (expense.fieldValues ?? []).map((fv) => {
      const name = fv.field?.fieldName ?? 'Polje'
      return `${name}: ${toNumber(fv.value).toFixed(2)} KM`
    })
  }
  return formatExpenseNotesSummary(expense.notes).lineLabels
}

export const hasInvoiceDetail = (expense: Expense): boolean => {
  if (expense.category?.isFixed) return (expense.fieldValues ?? []).length > 0
  return parseExpenseNotes(expense.notes).lineItems.length > 0
}

export const notesPreviewFor = (expense: Expense): string => {
  if (expense.category?.isFixed) return expense.notes ?? ''
  return formatExpenseNotesSummary(expense.notes).userNotes
}
