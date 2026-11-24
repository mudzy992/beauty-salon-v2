import { useCallback, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useAuthStore } from '../../stores/auth.store'
import { getSalonDateOnly } from '../../../../shared/business-date.mjs'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { Holiday, SalonSettings } from './salon-types'
import { isHolidayList } from './salon-holiday-validation'

type Props = {
  salon: SalonSettings | null
  sessionVersion: number
  sequence: MutableRefObject<number>
  holidaySequence: MutableRefObject<number>
  salonIdRef: MutableRefObject<string | null>
  activeRef: MutableRefObject<boolean>
  setSaving: Dispatch<SetStateAction<boolean>>
  setConfirmRequest: Dispatch<SetStateAction<AdminConfirmRequest | null>>
  showApiError: (err: unknown, fallbackKey: string) => void
  onHolidayReadStart: () => void
}

export function useSalonHolidays({ salon, sessionVersion, sequence, holidaySequence, salonIdRef, activeRef, setSaving, setConfirmRequest, showApiError, onHolidayReadStart }: Props) {
  const { t } = useTranslation()
  const { success, warning } = useAppToast()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [holidayReadError, setHolidayReadError] = useState(false)
  const [holidayReloading, setHolidayReloading] = useState(false)
  // Synchronous guard also covers event handlers and confirmations captured before a rerender.
  const readBlockedRef = useRef(false)
  const resetHolidayReadState = useCallback(() => { readBlockedRef.current = false; setHolidayReadError(false); setHolidayReloading(false) }, [])
  const sortedHolidays = useMemo(
    () => holidays.slice().sort((a, b) => a.date.localeCompare(b.date)),
    [holidays],
  )


  const [holidayOpen, setHolidayOpen] = useState(false)
  const [editHoliday, setEditHoliday] = useState<Holiday | null>(null)
  const [holForm, setHolForm] = useState({ date: '', name: '', message: '', sendPush: false })

  const reloadHolidays = async (): Promise<boolean> => {
    if (!salon || !activeRef.current || salonIdRef.current !== salon.id || useAuthStore.getState().sessionVersion !== sessionVersion) return false
    const request = ++holidaySequence.current
    const salonRequest = sequence.current
    const current = () => activeRef.current && request === holidaySequence.current && salonRequest === sequence.current && salonIdRef.current === salon.id && useAuthStore.getState().sessionVersion === sessionVersion
    readBlockedRef.current = true
    onHolidayReadStart()
    setConfirmRequest(null)
    setHolidayReloading(true)
    try {
      const { data } = await api.get<SalonSettings>(`/api/salon/${salon.id}`)
      if (!current()) return false
      if (!data || data.id !== salon.id || !isHolidayList(data.holidays)) throw new Error('Invalid holidays')
      setHolidays(data.holidays)
      readBlockedRef.current = false
      setHolidayReadError(false)
      return true
    } catch (err) {
      if (current()) { setHolidayReadError(true); showApiError(err, 'salon.errors.loadHolidaysFailed') }
      return false
    } finally {
      if (current()) setHolidayReloading(false)
    }
  }

  const openHolidayForm = (h?: Holiday) => {
    if (readBlockedRef.current) return
    if (h) {
      setEditHoliday(h)
      setHolForm({ date: h.date.slice(0, 10), name: h.name, message: h.message ?? '', sendPush: h.sendPush })
    } else {
      setEditHoliday(null)
      setHolForm({ date: '', name: '', message: '', sendPush: false })
    }
    setHolidayOpen(true)
  }

  const handleSaveHoliday = async () => {
    if (!salon || readBlockedRef.current) return
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
    if (readBlockedRef.current) return
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('salon.confirmDeleteHoliday'),
      confirmLabel: t('common.delete'),
      action: async () => {
        if (readBlockedRef.current) return
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
    if (readBlockedRef.current) return
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
    holidays, setHolidays, sortedHolidays, holidaysSummary,
    holidayReadError, holidayReloading, reloadHolidays, resetHolidayReadState,
    holidayOpen, setHolidayOpen, editHoliday, holForm, setHolForm,
    openHolidayForm, handleSaveHoliday, handleDeleteHoliday, handleSendNotification,
  }
}
