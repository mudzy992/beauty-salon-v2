import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createManualEntry,
  deleteManualEntry,
  fetchIncomeBook,
  fetchIncomeBookIntegrity,
  fetchIncomeBooks,
  lockIncomeBook,
  resyncIncomeBook,
  unlockIncomeBook,
  updateManualEntry,
} from '../api/income-books.api'
import { financeKeys } from './query-keys'
import type { ManualEntryPayload } from '../finance.types'

export const useIncomeBooks = () =>
  useQuery({
    queryKey: financeKeys.incomeBooks(),
    queryFn: fetchIncomeBooks,
  })

export const useIncomeBook = (bookId: string | null) =>
  useQuery({
    queryKey: financeKeys.incomeBook(bookId ?? ''),
    queryFn: () => fetchIncomeBook(bookId as string),
    enabled: Boolean(bookId),
  })

export const useIncomeBookIntegrity = (bookId: string | null) =>
  useQuery({
    queryKey: financeKeys.incomeIntegrity(bookId ?? ''),
    queryFn: () => fetchIncomeBookIntegrity(bookId as string),
    enabled: Boolean(bookId),
  })

export const useIncomeBookMutations = (bookId: string | null) => {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: financeKeys.all })
  }

  const lock = useMutation({
    mutationFn: () => lockIncomeBook(bookId as string),
    onSuccess: invalidate,
  })

  const unlock = useMutation({
    mutationFn: (reason: string) => unlockIncomeBook(bookId as string, reason),
    onSuccess: invalidate,
  })

  const resync = useMutation({
    mutationFn: () => resyncIncomeBook(bookId as string),
    onSuccess: invalidate,
  })

  const saveManualEntry = useMutation({
    mutationFn: (args: { entryId?: string; payload: ManualEntryPayload }) =>
      args.entryId
        ? updateManualEntry(bookId as string, args.entryId, args.payload)
        : createManualEntry(bookId as string, args.payload),
    onSuccess: invalidate,
  })

  const removeManualEntry = useMutation({
    mutationFn: (entryId: string) =>
      deleteManualEntry(bookId as string, entryId),
    onSuccess: invalidate,
  })

  return { lock, unlock, resync, saveManualEntry, removeManualEntry }
}
