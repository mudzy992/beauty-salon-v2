import type {
  Expense,
  ExpenseFilters,
  LineItem,
  SortDirection,
} from '../finance.types'
import { toNumber } from '../finance.utils'

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
      const haystack = [
        expense.title,
        expense.notes ?? '',
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

export const sumLineItems = (items: LineItem[]): number =>
  items.reduce(
    (sum, item) => sum + toNumber(item.qty) * toNumber(item.price),
    0,
  )

export const createEmptyLineItem = (): LineItem => ({
  name: '',
  qty: 1,
  price: 0,
})
