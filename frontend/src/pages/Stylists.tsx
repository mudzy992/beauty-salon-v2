import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Loader2, Pencil, X } from 'lucide-react'

import api from '../api/client'
import {
  fetchAllPublicServices,
  fetchAllPublicStylistServices,
} from '../api/catalog'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { getIntlLocale, formatWeekday } from '../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'
import { useAppToast } from '../lib/toast/useAppToast'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'

interface StylistProfile {
  id: string
  userId: string
  bio: string | null
  specialization: string | null
  status?: 'PENDING' | 'ACTIVE' | string | null
  isActive: boolean
  hireDate: string | null
  user?: { username: string; email: string | null; firstName: string | null; lastName: string | null }
}

interface WorkingHours {
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorkingDay: boolean
}

interface ServiceOption {
  id: string
  name: string
  subcategory?: { name: string; category?: { name: string } }
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export default function Stylists() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
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
      .get<StylistProfile[] | PaginatedResponse<StylistProfile>>('/api/stylists', {
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
    fetchAllPublicServices<ServiceOption>()
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
        fetchAllPublicStylistServices<{ serviceId?: string; id?: string }>(s.id),
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
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), 'stylists.errors.saveFailed')))
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.stylists')}</h1>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-3 font-medium">{t('stylists.table.user')}</th>
                  <th className="p-3 font-medium">{t('stylists.table.email')}</th>
                  <th className="p-3 font-medium">{t('stylists.table.specialization')}</th>
                  <th className="p-3 font-medium">{t('stylists.table.hireDate')}</th>
                  <th className="p-3 font-medium">{t('stylists.table.status')}</th>
                  <th className="p-3 text-right font-medium">{t('stylists.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {stylists.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-slate-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  stylists.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                      onClick={() => void openEditForm(s)}
                    >
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-50">
                        {s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''} (${s.user.username})`.trim() : s.userId}
                      </td>
                      <td className="p-3">{s.user?.email ?? '-'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{s.specialization ?? '-'}</span>
                          {String(s.status ?? '').toUpperCase() === 'PENDING' ? (
                            <Badge variant="warning" className="text-[10px]">
                              {t('stylists.status.pending')}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3">{s.hireDate ? formatDateOnlyLocale(s.hireDate.slice(0, 10), locale) : '—'}</td>
                      <td className="p-3">
                        <Badge variant={s.isActive ? 'success' : 'danger'} className="text-[10px]">
                          {s.isActive ? t('stylists.status.active') : t('stylists.status.inactive')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button asChild type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.analytics')}>
                            <RouterLink to={`/admin/stylist-analytics?stylistId=${s.id}`}>
                              <Eye className="h-4 w-4 text-teal-600" />
                            </RouterLink>
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.edit')} onClick={() => void openEditForm(s)}>
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{t('stylists.table.total', { count: total })}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
            {t('common.previous')}
          </Button>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {page + 1} / {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <Button type="button" size="sm" variant="outline" disabled={page >= Math.ceil(total / pageSize) - 1} onClick={() => setPage((prev) => prev + 1)}>
            {t('common.next')}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {t('stylists.profileTitle')}{' '}
              {selectedStylist && String(selectedStylist.status ?? '').toUpperCase() === 'PENDING' ? (
                <Badge variant="warning" className="ml-2 align-middle text-[10px]">
                  {t('stylists.status.pending')}
                </Badge>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profile">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="profile">{t('stylists.tabs.profile')}</TabsTrigger>
              <TabsTrigger value="hours">{t('stylists.tabs.hours')}</TabsTrigger>
              <TabsTrigger value="skills">{t('stylists.tabs.competencies')}</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label>{t('stylists.specializationAuto')}</Label>
                  <Input className="mt-1" value={form.specialization} readOnly />
                  <p className="mt-1 text-xs text-slate-500">
                    {t('stylists.specializationHint')}
                  </p>
                  {selectedServices.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-slate-600 dark:text-slate-300">{t('stylists.selectedCompetencies')}</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedServices.map((svc) => (
                          <Badge key={svc.id} variant="brand" className="text-[10px]">
                            {svc.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <Label>{t('stylists.bio')}</Label>
                  <Textarea className="mt-1" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t('stylists.hireDate')}</Label>
                    <Input className="mt-1" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between gap-3 md:pt-7">
                    <Label className="mb-0">{t('common.active')}</Label>
                    <Switch checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <div className="app-table-wrap rounded-md border border-slate-200 dark:border-slate-800">
                <table className="app-table w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                      <th className="p-3 font-medium">{t('stylists.day')}</th>
                      <th className="p-3 font-medium">{t('stylists.workingDay')}</th>
                      <th className="p-3 font-medium">{t('stylists.start')}</th>
                      <th className="p-3 font-medium">{t('stylists.end')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingHours.map((wh) => (
                      <tr key={wh.dayOfWeek} className={!wh.isWorkingDay ? 'opacity-60' : undefined}>
                        <td className="p-3 font-medium">{formatWeekday(wh.dayOfWeek, i18n.language)}</td>
                        <td className="p-3">
                          <Switch checked={wh.isWorkingDay} onCheckedChange={(checked) => updateWH(wh.dayOfWeek, 'isWorkingDay', checked)} />
                        </td>
                        <td className="p-3">
                          <Input
                            type="time"
                            className="h-9 w-[140px]"
                            value={wh.startTime}
                            onChange={(e) => updateWH(wh.dayOfWeek, 'startTime', e.target.value)}
                            disabled={!wh.isWorkingDay}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="time"
                            className="h-9 w-[140px]"
                            value={wh.endTime}
                            onChange={(e) => updateWH(wh.dayOfWeek, 'endTime', e.target.value)}
                            disabled={!wh.isWorkingDay}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs text-slate-600 dark:text-slate-300">{t('stylists.selectedCompetencies')} ({t('stylists.removeCompetencyHint')})</p>
                  {selectedServices.length === 0 ? (
                    <p className="text-sm text-slate-500">{t('stylists.noSelectedCompetencies')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedServices.map((svc) => (
                        <span key={svc.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <span>{svc.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleService(svc.id)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                            aria-label={t('stylists.aria.removeCompetency')}
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs text-slate-600 dark:text-slate-300">{t('stylists.availableCompetencies')}</p>
                  {unselectedServices.length === 0 ? (
                    <p className="text-sm text-slate-500">{t('stylists.allCompetenciesSelected')}</p>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto">
                      {unselectedServices.map((svc) => (
                        <label
                          key={svc.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40"
                        >
                          <input
                            type="checkbox"
                            checked={stylistServiceIds.includes(svc.id)}
                            onChange={() => toggleService(svc.id)}
                            className="mt-0.5 h-4 w-4 accent-brand-gold-ring"
                          />
                          <span className="text-sm">
                            <span className="font-medium text-slate-900 dark:text-slate-50">{svc.name}</span>
                            {svc.subcategory ? (
                              <span className="ml-1 text-slate-500">
                                ({svc.subcategory.category?.name} &gt; {svc.subcategory.name})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {allServices.length === 0 ? <p className="text-sm text-slate-500">{t('stylists.noServicesAvailable')}</p> : null}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSaveAll()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

