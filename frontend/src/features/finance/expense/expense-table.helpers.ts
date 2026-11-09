import { formatExpenseNotesSummary, parseExpenseNotes } from './expense-notes'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'
import type { Expense } from '../finance.types'

export const PREVIEW_LIMIT = 3

export const detailLabelsFor = (
  expense: Expense,
  fieldFallback = 'Polje',
  language = 'bs',
): string[] => {
  if (expense.category?.isFixed) {
    return (expense.fieldValues ?? []).map((fv) => {
      const name = fv.field?.fieldName ?? fieldFallback
      // Iznos ide kroz formatLocalizedAmount: bs-BA daje "1.234,50 KM", en-GB "1,234.50 KM".
      // `.toFixed(2) + ' KM'` bi u bs dalo "1234.50 KM" — pogrešan decimalni separator.
      return `${name}: ${formatLocalizedAmount(Number(fv.value) || 0, language)}`
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
