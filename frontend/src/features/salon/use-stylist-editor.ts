import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { fetchCompleteAdminServices, fetchCompleteAdminStylistServices } from '../../api/catalog'
import { getErrorMessage, getErrorCode } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { useAppToast } from '../../lib/toast/useAppToast'
import { synchronizeAuthFromStorage, useAuthStore } from '../../stores/auth.store'
import type { StylistProfile, WorkingHours, ServiceOption } from './stylist-types'

export function useStylistEditor(loadData: () => void) {
  const { t } = useTranslation()
  const { success, error } = useAppToast()
  const [open, setOpenState] = useState(false)
  const [selectedStylist, setSelectedStylist] = useState<StylistProfile | null>(null)
  const [editorState, setEditorState] = useState<'loading' | 'error' | 'ready'>('loading')
  const [editorErrorKey, setEditorErrorKey] = useState('stylists.errors.profileLoadFailed')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const loadDataRef = useRef(loadData)
  loadDataRef.current = loadData
  const revision = useRef(0)
  const mounted = useRef(true)
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const readySession = useRef<number | null>(null)
  const [allServices, setAllServices] = useState<ServiceOption[]>([])
  const [form, setForm] = useState({ bio: '', specialization: '', isActive: true, hireDate: '' })
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  const [stylistServiceIds, setStylistServiceIds] = useState<string[]>([])

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; revision.current += 1 }
  }, [])

  const setOpen = useCallback((value: boolean) => {
    if (!value) { revision.current += 1; readySession.current = null }
    setOpenState(value)
  }, [])

  useEffect(() => {
    revision.current += 1
    readySession.current = null
    setOpenState(false)
  }, [sessionVersion])

  const loadEditor = useCallback(async (stylist: StylistProfile) => {
    synchronizeAuthFromStorage()
    const session = useAuthStore.getState().sessionVersion
    const request = ++revision.current
    readySession.current = null
    setSelectedStylist(stylist)
    setEditorErrorKey('stylists.errors.profileLoadFailed')
    setEditorState('loading')
    setOpenState(true)
    try {
      const [whRes, serviceRows, services] = await Promise.all([
        api.get<WorkingHours[]>(`/api/stylists/${stylist.id}/working-hours`),
        fetchCompleteAdminStylistServices<{ serviceId?: string; id?: string }>(stylist.id),
        fetchCompleteAdminServices<ServiceOption>(),
      ])
      if (request !== revision.current || useAuthStore.getState().sessionVersion !== session) return
      const existing = whRes.data
      if (!Array.isArray(existing) || existing.some(w => !w || !Number.isInteger(w.dayOfWeek) || w.dayOfWeek < 0 || w.dayOfWeek > 6 || typeof w.startTime !== 'string' || typeof w.endTime !== 'string' || typeof w.isWorkingDay !== 'boolean')) throw new Error('Invalid working hours')
      // This editor can only represent one weekly row per day. A replacement
      // write would otherwise silently erase date overrides or extra shifts.
      if (existing.some(w => w.dateOverride != null) || new Set(existing.map(w => w.dayOfWeek)).size !== existing.length) {
        setEditorErrorKey('stylists.errors.unsupportedHours')
        setEditorState('error')
        return
      }
      if (services.some(s => !s || typeof s.id !== 'string' || !s.id || typeof s.name !== 'string') || serviceRows.some(s => !s || typeof (s.serviceId ?? s.id) !== 'string' || !(s.serviceId ?? s.id))) throw new Error('Invalid stylist services')
      const ids = serviceRows.map(s => (s.serviceId ?? s.id) as string)
      if (ids.some(id => !services.some(service => service.id === id))) throw new Error('Incomplete stylist catalog')
      const full: WorkingHours[] = Array.from({ length: 7 }, (_, i) =>
        existing.find(w => w.dayOfWeek === i) ?? { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isWorkingDay: i >= 1 && i <= 5 },
      )
      setAllServices(services)
      setWorkingHours(full)
      setStylistServiceIds(ids)
      setForm({ bio: stylist.bio ?? '', specialization: services.filter(s => ids.includes(s.id)).map(s => s.name).join(', '), isActive: stylist.isActive, hireDate: stylist.hireDate?.slice(0, 10) ?? '' })
      readySession.current = session
      setEditorState('ready')
    } catch {
      if (request === revision.current && useAuthStore.getState().sessionVersion === session) setEditorState('error')
    }
  }, [])

  const handleSaveAll = async () => {
    synchronizeAuthFromStorage()
    if (!selectedStylist || editorState !== 'ready' || savingRef.current || readySession.current !== useAuthStore.getState().sessionVersion) return
    const request = revision.current
    const session = readySession.current
    const stillCurrentSession = () => mounted.current && useAuthStore.getState().sessionVersion === session
    const stylist = selectedStylist
    savingRef.current = true
    setSaving(true)
    try {
      const payload: Record<string, unknown> = { bio: form.bio || undefined, specialization: form.specialization || undefined, isActive: form.isActive }
      if (form.hireDate) payload.hireDate = form.hireDate
      if (String(stylist.status ?? '').toUpperCase() === 'PENDING') payload.status = 'ACTIVE'
      await api.patch(`/api/stylists/${stylist.id}`, payload)
      synchronizeAuthFromStorage()
      if (!stillCurrentSession()) return
      await Promise.all([
        api.post(`/api/stylists/${stylist.id}/working-hours`, { workingHours }),
        api.post(`/api/stylists/${stylist.id}/services`, { serviceIds: stylistServiceIds }),
      ])
      if (!stillCurrentSession()) return
      loadDataRef.current()
      if (request === revision.current) {
        success(t('stylists.saveSuccess'))
        setOpen(false)
      }
    } catch (err) {
      if (stillCurrentSession() && request === revision.current) error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), 'stylists.errors.saveFailed', getErrorCode(err))))
    } finally {
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const updateWH = (day: number, field: keyof WorkingHours, value: string | boolean) => {
    setWorkingHours(prev => prev.map(w => w.dayOfWeek === day ? { ...w, [field]: value } : w))
  }
  const toggleService = (svcId: string) => {
    setStylistServiceIds(prev => {
      const nextIds = prev.includes(svcId) ? prev.filter(id => id !== svcId) : [...prev, svcId]
      setForm(curr => ({ ...curr, specialization: allServices.filter(s => nextIds.includes(s.id)).map(s => s.name).join(', ') }))
      return nextIds
    })
  }
  const selectedServices = allServices.filter(s => stylistServiceIds.includes(s.id))
  const unselectedServices = allServices.filter(s => !stylistServiceIds.includes(s.id))
  return { open, setOpen, selectedStylist, editorState, editorErrorKey, saving, allServices, form, setForm, workingHours, stylistServiceIds, openEditForm: loadEditor, retryEditor: () => { if (selectedStylist) void loadEditor(selectedStylist) }, handleSaveAll, updateWH, toggleService, selectedServices, unselectedServices }
}
