import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { getErrorMessage, getErrorCode } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useAuthStore } from '../../stores/auth.store'
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
  const [loadError, setLoadError] = useState(false)
  const sequence = useRef(0)
  const sessionVersion = useAuthStore(state => state.sessionVersion)
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
    const request = ++sequence.current
    const current = () => request === sequence.current && useAuthStore.getState().sessionVersion === sessionVersion
    setLoading(true)
    setLoadError(false)
    setNoSalonExists(false)
    try {
      let list: SalonSettings[] | null = null
      let listResponse: { data: SalonSettings[] } | null = null
      try {
        listResponse = await api.get<SalonSettings[]>('/api/salon/list')
      } catch {
        if (!current()) return
        const pubRes = await api.get<SalonSettings | null>('/api/salon')
        if (!current()) return
        if (pubRes.data !== null) {
          if (!pubRes.data || typeof pubRes.data.id !== 'string' || !pubRes.data.id) throw new Error('Invalid public salon')
          const detailRes = await api.get<SalonSettings>(`/api/salon/${pubRes.data.id}`)
          if (!current()) return
          if (!detailRes.data || detailRes.data.id !== pubRes.data.id) throw new Error('Invalid salon detail')
          list = [detailRes.data]
        } else {
          list = []
        }
      }
      if (!current()) return
      if (listResponse) {
        if (!Array.isArray(listResponse.data)) throw new Error('Invalid salon list')
        list = listResponse.data
      }
      if (!list) throw new Error('Invalid salon list')
      if (list.length > 0 && !list[0]) throw new Error('Invalid salon data')
      const s = list[0] ?? null
      if (s && (
        typeof s.id !== 'string' || !s.id || typeof s.name !== 'string' ||
        !Array.isArray(s.workingHours) || !Array.isArray(s.holidays) ||
        s.workingHours.some(w => !w || !Number.isInteger(w.dayOfWeek) || w.dayOfWeek < 0 || w.dayOfWeek > 6 || typeof w.openTime !== 'string' || typeof w.closeTime !== 'string' || typeof w.isWorkingDay !== 'boolean') ||
        new Set(s.workingHours.map(w => w.dayOfWeek)).size !== s.workingHours.length ||
        s.holidays.some(h => !h || typeof h.id !== 'string' || typeof h.name !== 'string' || typeof h.date !== 'string')
      )) throw new Error('Invalid salon data')

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
          if (!current()) return
          await api.post(`/api/salon/${s.id}/working-hours/ensure`)
        } catch {}
      }

      if (current()) setHolidays(s.holidays ?? [])
    } catch (err) {
      if (!current()) return
      setLoadError(true)
      showApiError(err, 'salon.errors.loadFailed')
    } finally {
      if (current()) setLoading(false)
    }
  }, [showApiError, sessionVersion])

  useEffect(() => {
    loadSalon()
    return () => { sequence.current += 1 }
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
    salon, loading, loadError, loadSalon, saving, confirmRequest, setConfirmRequest, noSalonExists,
    formData, setFormData, workingHours, holidays, sortedHolidays, holidaysSummary,
    holidayOpen, setHolidayOpen, editHoliday, holForm, setHolForm, updateWH,
    openHolidayForm, handleCreateSalon, handleSaveSettings, handleSaveWorkingHours,
    handleSaveHoliday, handleDeleteHoliday, handleSendNotification,
  }
}
