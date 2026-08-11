import type {
  Expense,
  ExpenseFilters,
  LineItem,
  SortDirection,
  TemplateField,
} from '../finance.types'
import { toNumber } from '../finance.utils'
import { parseExpenseNotes } from './expense-notes'
import {
  computeLinesTotal,
  createEmptyModularLine,
  labelFromLineValues,
} from './expense-line-roles'

export const EMPTY_EXPENSE_FILTERS: ExpenseFilters = {
  search: '',
  categoryId: '',
  minAmount: '',
  maxAmount: '',
  onlyWithAttachments: false,
}

export type ExpenseSortField = 'createdAt' | 'title' | 'totalAmount'

export const filterExpenses = (
  expenses: Expense[],
  filters: ExpenseFilters,
): Expense[] => {
  const term = filters.search.trim().toLowerCase()
  const min = filters.minAmount === '' ? null : Number(filters.minAmount)
  const max = filters.maxAmount === '' ? null : Number(filters.maxAmount)

  return expenses.filter((expense) => {
    if (filters.categoryId && expense.category?.id !== filters.categoryId) {
      return false
    }
    if (filters.onlyWithAttachments && !(expense.attachments ?? []).length) {
      return false
    }
    if (term) {
      const fields = expense.category?.template?.fields ?? []
      const parsed = parseExpenseNotes(expense.notes, fields)
      const haystack = [
        expense.title,
        parsed.userNotes,
        ...parsed.lineItems.map((item) => labelFromLineValues(fields, item.values)),
        expense.category?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(term)) return false
    }
    const amount = toNumber(expense.totalAmount)
    if (min !== null && Number.isFinite(min) && amount < min) return false
    if (max !== null && Number.isFinite(max) && amount > max) return false
    return true
  })
}

export const sortExpenses = (
  expenses: Expense[],
  field: ExpenseSortField,
  direction: SortDirection,
): Expense[] => {
  const factor = direction === 'asc' ? 1 : -1
  return [...expenses].sort((a, b) => {
    if (field === 'totalAmount') {
      return (toNumber(a.totalAmount) - toNumber(b.totalAmount)) * factor
    }
    return String(a[field]).localeCompare(String(b[field]), 'bs') * factor
  })
}

export const sumExpenses = (expenses: Expense[]): number =>
  expenses.reduce((sum, expense) => sum + toNumber(expense.totalAmount), 0)

export const sumLineItems = (
  items: LineItem[],
  fields: TemplateField[] = [],
): number => computeLinesTotal(fields, items)

export const createEmptyLineItem = (fields: TemplateField[] = []): LineItem =>
  createEmptyModularLine(fields)
