import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { fetchAllAdminServices, fetchAllAdminStylistServices } from '../../api/catalog'
import { getErrorMessage, getErrorCode } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { StylistProfile, WorkingHours, ServiceOption } from './stylist-types'

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function useStylistManagement() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [stylists, setStylists] = useState<StylistProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [selectedStylist, setSelectedStylist] = useState<StylistProfile | null>(null)

  const [allServices, setAllServices] = useState<ServiceOption[]>([])

  const [form, setForm] = useState({
    bio: '',
    specialization: '',
    isActive: true,
    hireDate: '',
  })

  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([])
  const [stylistServiceIds, setStylistServiceIds] = useState<string[]>([])

  const loadData = useCallback(() => {
    setLoading(true)
    api
      .get<StylistProfile[] | PaginatedResponse<StylistProfile>>('/api/stylists/admin', {
        params: { page, pageSize },
      })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setStylists(r.data)
          setTotal(r.data.length)
          return
        }
        setStylists(Array.isArray(r.data.items) ? r.data.items : [])
        setTotal(r.data.total ?? 0)
      })
      .catch(() => {
        setStylists([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [page, pageSize])

  const loadAllServices = useCallback(() => {
    fetchAllAdminServices<ServiceOption>()
      .then(setAllServices)
      .catch(() => setAllServices([]))
  }, [])

  useEffect(() => {
    loadData()
    loadAllServices()
  }, [loadData, loadAllServices])

  const openEditForm = async (s: StylistProfile) => {
    setEditId(s.id)
    setSelectedStylist(s)
    setForm({
      bio: s.bio ?? '',
      specialization: s.specialization ?? '',
      isActive: s.isActive,
      hireDate: s.hireDate?.slice(0, 10) ?? '',
    })
    try {
      const [whRes, serviceRows] = await Promise.all([
        api.get<WorkingHours[]>(`/api/stylists/${s.id}/working-hours`),
        fetchAllAdminStylistServices<{ serviceId?: string; id?: string }>(s.id),
      ])
      const existing = Array.isArray(whRes.data) ? whRes.data : []
      const full: WorkingHours[] = Array.from({ length: 7 }, (_, i) => {
        const found = existing.find((w) => w.dayOfWeek === i)
        return found ?? { dayOfWeek: i, startTime: '09:00', endTime: '17:00', isWorkingDay: i >= 1 && i <= 5 }
      })
      setWorkingHours(full)
      const ids = serviceRows
        .map((service) => service.serviceId ?? service.id)
        .filter((id): id is string => Boolean(id))
      setStylistServiceIds(ids)
      setForm((prev) => ({
        ...prev,
        specialization: allServices.filter((ss) => ids.includes(ss.id)).map((ss) => ss.name).join(', '),
      }))
    } catch {
      setWorkingHours(
        Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          startTime: '09:00',
          endTime: '17:00',
          isWorkingDay: i >= 1 && i <= 5,
        })),
      )
      setStylistServiceIds([])
    }
    setOpen(true)
  }

  const handleSaveAll = async () => {
    if (!editId) {
      warning(t('stylists.addViaUsers'))
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        bio: form.bio || undefined,
        specialization: form.specialization || undefined,
        isActive: form.isActive,
      }
      if (form.hireDate) payload.hireDate = form.hireDate
      if (selectedStylist && String(selectedStylist.status ?? '').toUpperCase() === 'PENDING') {
        payload.status = 'ACTIVE'
      }

      if (editId) {
        await api.patch(`/api/stylists/${editId}`, payload)
        await Promise.all([
          api.post(`/api/stylists/${editId}/working-hours`, { workingHours }),
          api.post(`/api/stylists/${editId}/services`, { serviceIds: stylistServiceIds }),
        ])
      }
      success(t('stylists.saveSuccess'))
      loadData()
      setOpen(false)
    } catch (err) {
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), 'stylists.errors.saveFailed', getErrorCode(err))))
    } finally {
      setSaving(false)
    }
  }

  const updateWH = (day: number, field: keyof WorkingHours, value: string | boolean) => {
    setWorkingHours((prev) => prev.map((w) => (w.dayOfWeek === day ? { ...w, [field]: value } : w)))
  }

  const toggleService = (svcId: string) => {
    setStylistServiceIds((prev) => {
      const nextIds = prev.includes(svcId) ? prev.filter((id) => id !== svcId) : [...prev, svcId]
      const specNames = allServices.filter((s) => nextIds.includes(s.id)).map((s) => s.name)
      setForm((curr) => ({ ...curr, specialization: specNames.join(', ') }))
      return nextIds
    })
  }

  const selectedServices = allServices.filter((s) => stylistServiceIds.includes(s.id))
  const unselectedServices = allServices.filter((s) => !stylistServiceIds.includes(s.id))

  return { stylists, loading, saving, page, setPage, pageSize, total, open, setOpen, selectedStylist, allServices, form, setForm, workingHours, stylistServiceIds, openEditForm, handleSaveAll, updateWH, toggleService, selectedServices, unselectedServices }
}
