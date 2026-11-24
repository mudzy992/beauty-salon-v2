import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { getErrorMessage, getErrorCode } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useAuthStore } from '../../stores/auth.store'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { SalonSettings, WorkingHours } from './salon-types'
import { useSalonHolidays } from './use-salon-holidays'
import { isHolidayList } from './salon-holiday-validation'

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
  const holidaySequence = useRef(0)
  const salonIdRef = useRef<string | null>(null)
  const activeRef = useRef(false)
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
  const {
    holidays, setHolidays, sortedHolidays, holidaysSummary, holidayReadError, holidayReloading,
    reloadHolidays, resetHolidayReadState, holidayOpen, setHolidayOpen,
    editHoliday, holForm, setHolForm, openHolidayForm, handleSaveHoliday,
    handleDeleteHoliday, handleSendNotification,
  } = useSalonHolidays({ salon, sessionVersion, sequence, holidaySequence, salonIdRef, activeRef, setSaving, setConfirmRequest, showApiError })

  const loadSalon = useCallback(async () => {
    const request = ++sequence.current
    const holidayRequest = ++holidaySequence.current
    const current = () => request === sequence.current && useAuthStore.getState().sessionVersion === sessionVersion
    setLoading(true)
    setLoadError(false)
    setNoSalonExists(false)
    resetHolidayReadState()
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
        !Array.isArray(s.workingHours) || !isHolidayList(s.holidays) ||
        s.workingHours.some(w => !w || !Number.isInteger(w.dayOfWeek) || w.dayOfWeek < 0 || w.dayOfWeek > 6 || typeof w.openTime !== 'string' || typeof w.closeTime !== 'string' || typeof w.isWorkingDay !== 'boolean') ||
        new Set(s.workingHours.map(w => w.dayOfWeek)).size !== s.workingHours.length
      )) throw new Error('Invalid salon data')

      const changedSalon = salonIdRef.current !== (s?.id ?? null)
      salonIdRef.current = s?.id ?? null
      const acceptedHolidayRequest = changedSalon ? ++holidaySequence.current : holidayRequest
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

      if (current() && acceptedHolidayRequest === holidaySequence.current) setHolidays(s.holidays ?? [])
    } catch (err) {
      if (!current()) return
      setLoadError(true)
      showApiError(err, 'salon.errors.loadFailed')
    } finally {
      if (current()) setLoading(false)
    }
  }, [showApiError, sessionVersion, setHolidays, resetHolidayReadState])

  useEffect(() => {
    activeRef.current = true
    loadSalon()
    return () => { activeRef.current = false; sequence.current += 1; holidaySequence.current += 1 }
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

  return {
    salon, loading, loadError, loadSalon, saving, confirmRequest, setConfirmRequest, noSalonExists,
    formData, setFormData, workingHours, holidays, sortedHolidays, holidaysSummary,
    holidayReadError, holidayReloading, reloadHolidays,
    holidayOpen, setHolidayOpen, editHoliday, holForm, setHolForm, updateWH,
    openHolidayForm, handleCreateSalon, handleSaveSettings, handleSaveWorkingHours,
    handleSaveHoliday, handleDeleteHoliday, handleSendNotification,
  }
}
