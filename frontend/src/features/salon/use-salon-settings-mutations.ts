import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { SalonSettings, WorkingHours } from './salon-types'
import type { SalonForm } from './salon-settings-data'

type Params = {
  salon: SalonSettings | null; formData: SalonForm; workingHours: WorkingHours[]
  setSaving: Dispatch<SetStateAction<boolean>>; loadSalon: () => Promise<void>
  showApiError: (err: unknown, fallbackKey: string) => void
}
export function useSalonSettingsMutations({ salon, formData, workingHours, setSaving, loadSalon, showApiError }: Params) {
  const { t } = useTranslation()
  const { success, warning } = useAppToast()
  const handleCreateSalon = async () => {
    if (!formData.name) {
      warning(t('salon.validation.nameRequired'))
      return
    }
    setSaving(true)
    try {
      await api.post('/api/salon', formData)
      success(t('salon.toast.created'))
      loadSalon()
    } catch (err) {
      showApiError(err, 'salon.errors.createFailed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!salon) return
    setSaving(true)
    try {
      await api.patch(`/api/salon/${salon.id}`, formData)
      success(t('salon.toast.settingsSaved'))
      loadSalon()
    } catch (err) {
      showApiError(err, 'salon.errors.saveSettingsFailed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWorkingHours = async () => {
    if (!salon) return
    setSaving(true)
    try {
      await api.post(`/api/salon/${salon.id}/working-hours`, { workingHours })
      success(t('salon.toast.workingHoursSaved'))
    } catch (err) {
      showApiError(err, 'salon.errors.saveWorkingHoursFailed')
    } finally {
      setSaving(false)
    }
  }
  return { handleCreateSalon, handleSaveSettings, handleSaveWorkingHours }
}
