import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'

type Dependencies = {
  setConfirmRequest: Dispatch<SetStateAction<AdminConfirmRequest | null>>
  requestMutationRefresh: () => void
  showApiError: (error: unknown, fallbackKey: string) => void
}

export function useServiceCategoryDeletion({ setConfirmRequest, requestMutationRefresh, showApiError }: Dependencies) {
  const { t } = useTranslation()
  const { success } = useAppToast()

  const handleDeleteCategory = (id: string, trigger: HTMLButtonElement) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      trigger,
      description: t('services.confirmDeleteCategory'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/services/categories/${id}`)
          success(t('services.toast.categoryDeleted'))
          requestMutationRefresh()
        } catch (err) {
          showApiError(err, 'services.errors.deleteCategoryFailed')
        }
      },
    })
  }

  const handleDeleteSubcategory = (id: string, trigger: HTMLButtonElement) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      trigger,
      description: t('services.confirmDeleteSubcategory'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/services/subcategories/${id}`)
          success(t('services.toast.subcategoryDeleted'))
          requestMutationRefresh()
        } catch (err) {
          showApiError(err, 'services.errors.deleteSubcategoryFailed')
        }
      },
    })
  }

  return { handleDeleteCategory, handleDeleteSubcategory }
}
