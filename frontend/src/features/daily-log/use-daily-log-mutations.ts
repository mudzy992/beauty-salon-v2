import { useState } from 'react'
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
  const { success, error } = toast
  const [deleteTarget, setDeleteTarget] = useState<DailyLogEntry | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<DailyLogEntry | null>(null)
  const [restoring, setRestoring] = useState(false)

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/api/daily-log/${id}/complete`)
      success('Unos kompletiran i prihod dodan u knjigu')
      loadData()
    } catch {
      error('Greška')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return
    setSaving(true)
    try {
      await api.delete(`/api/daily-log/${deleteTarget.id}`, {
        data: { reason: deleteReason.trim() },
      })
      success('Unos obrisan')
      setDeleteTarget(null)
      setDeleteReason('')
      loadData()
    } catch {
      error('Greška pri brisanju')
    } finally {
      setSaving(false)
    }
  }

  const handleRestoreConfirm = async (id: string, date?: string) => {
    setRestoring(true)
    try {
      await api.post(`/api/daily-log/${id}/restore`, date ? { date } : {})
      success('Unos vraćen')
      setRestoreTarget(null)
      loadData()
    } catch {
      error('Greška pri vraćanju')
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
