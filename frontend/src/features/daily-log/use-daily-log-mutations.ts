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

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/api/daily-log/${id}/restore`)
      success('Unos vraćen')
      loadData()
    } catch {
      error('Greška pri vraćanju')
    }
  }

  return {
    deleteTarget,
    setDeleteTarget,
    deleteReason,
    setDeleteReason,
    handleComplete,
    handleDelete,
    handleRestore,
  }
}
