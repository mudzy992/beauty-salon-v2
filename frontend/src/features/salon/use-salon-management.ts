import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { getErrorMessage, getErrorCode } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'
import { getSalonDateOnly } from '../../../../shared/business-date.mjs'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { SalonSettings, WorkingHours, Holiday } from './salon-types'

export function useSalonManagement() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()
  const showApiError = useCallback(
    (err: unknown, fallbackKey: string) => {
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), fallbackKey, getErrorCode(err))))
    },
    [error, t],
  )

  const [salon, setSalon] = useState<SalonSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)
  const [noSalonExists, setNoSalonExists] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    pauseBetweenServices: 10,
    cancellationDeadlineHours: 24,
    maxCancellationsBeforePenalty: 3,
    penaltyDurationDays: 30,
    reservationLockMinutes: 15,
  })

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const sortedHolidays = useMemo(
    () => holidays.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  )


  const [holidayOpen, setHolidayOpen] = useState(false)
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null)
  const [holForm, setHolForm] = useState({ date: '', name: '', message: '', sendPush: false })

  const loadSalon = useCallback(async () => {
    setLoading(true)
    setNoSalonExists(false)
    try {
      let s: SalonSettings | null = null
      try {
        const listRes = await api.get<SalonSettings[]>('/api/salon/list')
        if (Array.isArray(listRes.data) && listRes.data.length > 0) s = listRes.data[0]
      } catch {
        try {
          const pubRes = await api.get<SalonSettings | null>('/api/salon')
          if (pubRes.data && pubRes.data.id) {
            const detailRes = await api.get<SalonSettings>(`/api/salon/${pubRes.data.id}`)
            s = detailRes.data
          }
        } catch {}
      }

      if (!s) {
        setNoSalonExists(true)
        setSalon(null)
        return
      }

      setSalon(s)
      setFormData({
        name: s.name ?? '',
        address: s.address ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        description: s.description ?? '',
        pauseBetweenServices: s.pauseBetweenServices ?? 10,
        cancellationDeadlineHours: s.cancellationDeadlineHours ?? 24,
        maxCancellationsBeforePenalty: s.maxCancellationsBeforePenalty ?? 3,
        penaltyDurationDays: s.penaltyDurationDays ?? 30,
        reservationLockMinutes: s.reservationLockMinutes ?? 15,
      })

      if (s.workingHours && s.workingHours.length > 0) {
        const full: WorkingHours[] = Array.from({ length: 7 }, (_, i) => {
          const found = s!.workingHours!.find((w) => w.dayOfWeek === i)
          return found ?? { dayOfWeek: i, openTime: '09:00', closeTime: '17:00', isWorkingDay: i >= 1 && i <= 5 }
        })
        setWorkingHours(full)
      } else {
        const defaults: WorkingHours[] = Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          openTime: '09:00',
          closeTime: '17:00',
          isWorkingDay: i >= 1 && i <= 5,
        }))
        setWorkingHours(defaults)
        try {
          await api.post(`/api/salon/${s.id}/working-hours/ensure`)
        } catch {}
      }

      setHolidays(s.holidays ?? [])
    } catch (err) {
      setNoSalonExists(true)
      setSalon(null)
      showApiError(err, 'salon.errors.loadFailed')
    } finally {
      setLoading(false)
    }
  }, [showApiError])

  useEffect(() => {
    loadSalon()
  }, [loadSalon])

  useSocketEvent(
    'salon:updated',
    useCallback(() => {
      loadSalon()
    }, [loadSalon]),
  )

  const updateWH = (dayOfWeek: number, field: keyof WorkingHours, value: string | boolean) => {
    setWorkingHours((prev) => prev.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: value } : w)))
  }

  const reloadHolidays = async () => {
    if (!salon) return
    try {
      const { data } = await api.get<SalonSettings>(`/api/salon/${salon.id}`)
      setHolidays(data.holidays ?? [])
    } catch (err) {
      showApiError(err, 'salon.errors.loadHolidaysFailed')
    }
  }

  const openHolidayForm = (h?: Holiday) => {
    if (h) {
      setEditHoliday(h)
      setHolForm({ date: h.date.slice(0, 10), name: h.name, message: h.message ?? '', sendPush: h.sendPush })
    } else {
      setEditHoliday(null)
      setHolForm({ date: '', name: '', message: '', sendPush: false })
    }
    setHolidayOpen(true)
  }

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

  const handleSaveHoliday = async () => {
    if (!salon) return
    if (!holForm.date || !holForm.name) {
      warning(t('salon.validation.holidayRequired'))
      return
    }
    setSaving(true)
    try {
      if (editHoliday) await api.patch(`/api/salon/holidays/${editHoliday.id}`, holForm)
      else await api.post(`/api/salon/${salon.id}/holidays`, holForm)
      success(t('salon.toast.holidaySaved'))
      reloadHolidays()
      setHolidayOpen(false)
    } catch (err) {
      showApiError(err, 'salon.errors.saveHolidayFailed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHoliday = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('salon.confirmDeleteHoliday'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/salon/holidays/${id}`)
          success(t('salon.toast.holidayDeleted'))
          reloadHolidays()
        } catch (err) {
          showApiError(err, 'salon.errors.deleteHolidayFailed')
        }
      },
    })
  }

  const handleSendNotification = async (holidayId: string) => {
    try {
      await api.post(`/api/salon/holidays/${holidayId}/send-notification`)
      success(t('salon.toast.notificationSent'))
      reloadHolidays()
    } catch (err) {
      showApiError(err, 'salon.errors.sendNotificationFailed')
    }
  }

  const holidaysSummary = useMemo(() => {
    const today = getSalonDateOnly()
    const future = holidays
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((holiday) => holiday.date.slice(0, 10) >= today)
    return future.slice(0, 3)
  }, [holidays])

  return {
    salon, loading, saving, confirmRequest, setConfirmRequest, noSalonExists,
    formData, setFormData, workingHours, holidays, sortedHolidays, holidaysSummary,
    holidayOpen, setHolidayOpen, editHoliday, holForm, setHolForm, updateWH,
    openHolidayForm, handleCreateSalon, handleSaveSettings, handleSaveWorkingHours,
    handleSaveHoliday, handleDeleteHoliday, handleSendNotification,
  }
}
