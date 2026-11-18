import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Loader2, Pencil, X } from 'lucide-react'

import api from '../api/client'
import {
  fetchAllAdminServices,
  fetchAllAdminStylistServices,
} from '../api/catalog'
import { getErrorMessage, getErrorCode } from '../api/error'
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

import { DataTable, type DataTableColumn } from '../features/shell/admin/ui/data-table'
import { EmptyState } from '../features/shell/admin/ui/data-state'

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

  const stylistColumns: DataTableColumn<StylistProfile>[] = [
    {
      key: 'user',
      headerKey: 'stylists.table.user',
      className: 'p-3 font-medium text-content',
      render: (s) =>
        s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''} (${s.user.username})`.trim() : s.userId,
    },
    {
      key: 'email',
      headerKey: 'stylists.table.email',
      className: 'p-3',
      render: (s) => s.user?.email ?? '-',
    },
    {
      key: 'specialization',
      headerKey: 'stylists.table.specialization',
      className: 'p-3',
      render: (s) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{s.specialization ?? '-'}</span>
          {String(s.status ?? '').toUpperCase() === 'PENDING' ? (
            <Badge variant="warning" className="text-[10px]">
              {t('stylists.status.pending')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'hireDate',
      headerKey: 'stylists.table.hireDate',
      className: 'p-3',
      render: (s) => (s.hireDate ? formatDateOnlyLocale(s.hireDate.slice(0, 10), locale) : '—'),
    },
    {
      key: 'status',
      headerKey: 'stylists.table.status',
      className: 'p-3',
      render: (s) => (
        <Badge variant={s.isActive ? 'success' : 'danger'} className="text-[10px]">
          {s.isActive ? t('stylists.status.active') : t('stylists.status.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      headerKey: 'stylists.table.actions',
      align: 'right',
      className: 'p-3',
      // Klik na akcijsku ćeliju NE okida row-click: DataTable ignoriše klikove
      // s interaktivnih potomaka ('button, a, input, …').
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button asChild type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.analytics')}>
            <RouterLink to={`/admin/analytics?tab=stylists&stylistId=${s.id}`}>
              <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
            </RouterLink>
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.edit')} onClick={() => void openEditForm(s)}>
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  const workingHoursColumns: DataTableColumn<WorkingHours>[] = [
    {
      key: 'day',
      headerKey: 'stylists.day',
      className: 'p-3 font-medium',
      render: (wh) => formatWeekday(wh.dayOfWeek, i18n.language),
    },
    {
      key: 'workingDay',
      headerKey: 'stylists.workingDay',
      className: 'p-3',
      render: (wh) => (
        <Switch
          aria-label={t('stylists.aria.workingDayToggle', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          checked={wh.isWorkingDay}
          onCheckedChange={(checked) => updateWH(wh.dayOfWeek, 'isWorkingDay', checked)}
        />
      ),
    },
    {
      key: 'start',
      headerKey: 'stylists.start',
      className: 'p-3',
      render: (wh) => (
        <Input
          type="time"
          aria-label={t('stylists.aria.startTime', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          className="h-9 w-[140px]"
          value={wh.startTime}
          onChange={(e) => updateWH(wh.dayOfWeek, 'startTime', e.target.value)}
          disabled={!wh.isWorkingDay}
        />
      ),
    },
    {
      key: 'end',
      headerKey: 'stylists.end',
      className: 'p-3',
      render: (wh) => (
        <Input
          type="time"
          aria-label={t('stylists.aria.endTime', { day: formatWeekday(wh.dayOfWeek, i18n.language) })}
          className="h-9 w-[140px]"
          value={wh.endTime}
          onChange={(e) => updateWH(wh.dayOfWeek, 'endTime', e.target.value)}
          disabled={!wh.isWorkingDay}
        />
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-content">{t('nav.stylists')}</h1>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-content-strong">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="app-table-wrap">
            <DataTable
              caption={t('stylists.tableCaption')}
              columns={stylistColumns}
              rows={stylists}
              rowKey={(s) => s.id}
              onRowClick={(s) => void openEditForm(s)}
              empty={<EmptyState title={t('common.noData')} />}
            />
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-strong">{t('stylists.table.total', { count: total })}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
            {t('common.previous')}
          </Button>
          <p className="text-sm text-content-strong ">
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
                  <Label htmlFor="stylists-specialization-auto">{t('stylists.specializationAuto')}</Label>
                  <Input id="stylists-specialization-auto" className="mt-1" value={form.specialization} readOnly />
                  <p className="mt-1 text-xs text-content-strong">
                    {t('stylists.specializationHint')}
                  </p>
                  {selectedServices.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-1 text-xs text-content-strong ">{t('stylists.selectedCompetencies')}</p>
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
                  <Label htmlFor="stylists-bio">{t('stylists.bio')}</Label>
                  <Textarea id="stylists-bio" className="mt-1" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="stylists-hire-date">{t('stylists.hireDate')}</Label>
                    <Input id="stylists-hire-date" className="mt-1" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between gap-3 md:pt-7">
                    <Label className="mb-0">{t('common.active')}</Label>
                    <Switch aria-label={t('stylists.aria.activeToggle')} checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <div className="app-table-wrap rounded-md border border-line ">
                <DataTable
                  caption={t('stylists.workingHoursCaption')}
                  columns={workingHoursColumns}
                  rows={workingHours}
                  rowKey={(wh) => String(wh.dayOfWeek)}
                  rowClassName={(wh) => (!wh.isWorkingDay ? 'opacity-60' : undefined)}
                />
              </div>
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <div className="space-y-4">
                <div>
                  <p className="mb-1 text-xs text-content-strong ">{t('stylists.selectedCompetencies')} ({t('stylists.removeCompetencyHint')})</p>
                  {selectedServices.length === 0 ? (
                    <p className="text-sm text-content-strong">{t('stylists.noSelectedCompetencies')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedServices.map((svc) => (
                        <Badge key={svc.id} variant="secondary" className="gap-1 px-2 py-1 text-[11px] font-medium">
                          <span>{svc.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleService(svc.id)}
                            className="h-5 w-5 rounded-full hover:bg-surface-sunken"
                            aria-label={t('stylists.aria.removeCompetency')}
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs text-content-strong ">{t('stylists.availableCompetencies')}</p>
                  {unselectedServices.length === 0 ? (
                    <p className="text-sm text-content-strong">{t('stylists.allCompetenciesSelected')}</p>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto">
                      {unselectedServices.map((svc) => (
                        <label
                          key={svc.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 hover:bg-surface-muted"
                        >
                          <input
                            type="checkbox"
                            checked={stylistServiceIds.includes(svc.id)}
                            onChange={() => toggleService(svc.id)}
                            className="mt-0.5 h-4 w-4 accent-brand-gold-ring"
                          />
                          <span className="text-sm">
                            <span className="font-medium text-content">{svc.name}</span>
                            {svc.subcategory ? (
                              <span className="ml-1 text-content-strong">
                                ({svc.subcategory.category?.name} &gt; {svc.subcategory.name})
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                  {allServices.length === 0 ? <p className="text-sm text-content-strong">{t('stylists.noServicesAvailable')}</p> : null}
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

