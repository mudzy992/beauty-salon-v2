import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createExpense,
  deleteExpense,
  fetchExpenseBook,
  fetchExpenseBooks,
  lockExpenseBook,
  unlockExpenseBook,
  updateExpense,
} from '../api/expense-books.api'
import { financeKeys } from './query-keys'
import type { ExpensePayload } from '../finance.types'

export const useExpenseBooks = () =>
  useQuery({
    queryKey: financeKeys.expenseBooks(),
    queryFn: fetchExpenseBooks,
  })

export const useExpenseBook = (bookId: string | null) =>
  useQuery({
    queryKey: financeKeys.expenseBook(bookId ?? ''),
    queryFn: () => fetchExpenseBook(bookId as string),
    enabled: Boolean(bookId),
  })

export const useExpenseBookMutations = (bookId: string | null) => {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: financeKeys.all })
  }

  const lock = useMutation({
    mutationFn: () => lockExpenseBook(bookId as string),
    onSuccess: invalidate,
  })

  const unlock = useMutation({
    mutationFn: (reason: string) => unlockExpenseBook(bookId as string, reason),
    onSuccess: invalidate,
  })

  const saveExpense = useMutation({
    mutationFn: (args: { expenseId?: string; payload: ExpensePayload }) =>
      args.expenseId
        ? updateExpense(args.expenseId, args.payload)
        : createExpense(args.payload),
    onSuccess: invalidate,
  })

  const removeExpense = useMutation({
    mutationFn: (expenseId: string) => deleteExpense(expenseId),
    onSuccess: invalidate,
  })

  return { lock, unlock, saveExpense, removeExpense }
}
