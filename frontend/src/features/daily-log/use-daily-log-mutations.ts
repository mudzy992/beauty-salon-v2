import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { DailyLogEntry } from './types'

type ToastFns = ReturnType<typeof useAppToast>

type Args = {
  loadData: () => void
  setSaving: (v: boolean) => void
  toast: ToastFns
}

export const useDailyLogMutations = ({ loadData, setSaving, toast }: Args) => {
  const { t } = useTranslation()
  const { success, error } = toast
  const [deleteTarget, setDeleteTarget] = useState<DailyLogEntry | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<DailyLogEntry | null>(null)
  const [restoring, setRestoring] = useState(false)

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/api/daily-log/${id}/complete`)
      success(t('dailyLog.feedback.completed'))
      loadData()
    } catch {
      error(t('dailyLog.feedback.completeFailed'))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return
    setSaving(true)
    try {
      await api.delete(`/api/daily-log/${deleteTarget.id}`, {
        data: { reason: deleteReason.trim() },
      })
      success(t('dailyLog.feedback.deleted'))
      setDeleteTarget(null)
      setDeleteReason('')
      loadData()
    } catch {
      error(t('dailyLog.feedback.deleteFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreConfirm = async (id: string, date?: string) => {
    setRestoring(true)
    try {
      await api.post(`/api/daily-log/${id}/restore`, date ? { date } : {})
      success(t('dailyLog.feedback.restored'))
      setRestoreTarget(null)
      loadData()
    } catch {
      error(t('dailyLog.feedback.restoreFailed'))
    } finally {
      setRestoring(false)
    }
  }

  return {
    deleteTarget,
    setDeleteTarget,
    deleteReason,
    setDeleteReason,
    handleComplete,
    handleDelete,
    restoreTarget,
    setRestoreTarget,
    restoring,
    handleRestoreConfirm,
  }
}
