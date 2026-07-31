import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addTemplateField,
  fetchExpenseCategories,
  fetchExpenseTemplates,
  removeTemplateField,
  saveExpenseCategory,
  saveExpenseTemplate,
} from '../api/expense-catalog.api'
import { financeKeys } from './query-keys'
import type { TemplateFieldPayload } from '../finance.types'

export const useExpenseCategories = () =>
  useQuery({
    queryKey: financeKeys.expenseCategories(),
    queryFn: fetchExpenseCategories,
  })

/** Predlošci stižu sa ugniježđenim `fields` – nema pojedinačnih poziva po predlošku. */
export const useExpenseTemplates = () =>
  useQuery({
    queryKey: financeKeys.expenseTemplates(),
    queryFn: fetchExpenseTemplates,
  })

export const useExpenseCatalogMutations = () => {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: financeKeys.all })
  }

  return {
    saveCategory: useMutation({
      mutationFn: saveExpenseCategory,
      onSuccess: invalidate,
    }),
    saveTemplate: useMutation({
      mutationFn: saveExpenseTemplate,
      onSuccess: invalidate,
    }),
    addField: useMutation({
      mutationFn: (args: { templateId: string; payload: TemplateFieldPayload }) =>
        addTemplateField(args.templateId, args.payload),
      onSuccess: invalidate,
    }),
    removeField: useMutation({
      mutationFn: removeTemplateField,
      onSuccess: invalidate,
    }),
  }
}
