import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  addTemplateField,
  bootstrapLegacyColumns,
  createCategoryBundle,
  fetchExpenseCategories,
  removeTemplateField,
  updateCategoryBundle,
  updateTemplateField,
  type CategoryBundlePayload,
} from '../api/expense-catalog.api'
import { financeKeys } from './query-keys'
import type { TemplateFieldPayload } from '../finance.types'

export const useExpenseCategories = () =>
  useQuery({
    queryKey: financeKeys.expenseCategories(),
    queryFn: fetchExpenseCategories,
  })

export const useExpenseCatalogMutations = () => {
  const queryClient = useQueryClient()
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: financeKeys.all })
  }

  return {
    createBundle: useMutation({
      mutationFn: createCategoryBundle,
      onSuccess: invalidate,
    }),
    updateBundle: useMutation({
      mutationFn: updateCategoryBundle,
      onSuccess: invalidate,
    }),
    addField: useMutation({
      mutationFn: (args: { templateId: string; payload: TemplateFieldPayload }) =>
        addTemplateField(args.templateId, args.payload),
      onSuccess: invalidate,
    }),
    updateField: useMutation({
      mutationFn: (args: {
        fieldId: string
        payload: Partial<TemplateFieldPayload>
      }) => updateTemplateField(args.fieldId, args.payload),
      onSuccess: invalidate,
    }),
    removeField: useMutation({
      mutationFn: removeTemplateField,
      onSuccess: invalidate,
    }),
    bootstrapLegacy: useMutation({
      mutationFn: bootstrapLegacyColumns,
      onSuccess: invalidate,
    }),
  }
}

export type { CategoryBundlePayload }
