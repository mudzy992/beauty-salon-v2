import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Send, Trash2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { formatLocalizedDateTime, formatWeekday, getIntlLocale } from '../i18n/locale-utils.mjs'
import { useSocketEvent } from '../context/SocketContext'
import { useAppToast } from '../lib/toast/useAppToast'
import {
  formatDateOnlyLocale,
  getSalonDateOnly,
} from '../../../shared/business-date.mjs'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'

interface SalonSettings {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  logo: string | null
  pauseBetweenServices: number
  cancellationDeadlineHours: number
  maxCancellationsBeforePenalty: number
  penaltyDurationDays: number
  reservationLockMinutes: number
  workingHours?: WorkingHours[]
  holidays?: Holiday[]
}

interface WorkingHours {
  id?: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isWorkingDay: boolean
}

interface Holiday {
  id: string
  date: string
  name: string
  message: string | null
  sendPush: boolean
  pushSentAt: string | null
}

export default function Salon() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { success, error, warning } = useAppToast()
  const showApiError = useCallback(
    (err: unknown, fallbackKey: string) => {
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), fallbackKey)))
    },
    [error, t],
  )

  const [salon, setSalon] = useState<SalonSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  const handleDeleteHoliday = async (id: string) => {
    if (!window.confirm(t('salon.confirmDeleteHoliday'))) return
    try {
      await api.delete(`/api/salon/holidays/${id}`)
      success(t('salon.toast.holidayDeleted'))
      reloadHolidays()
    } catch (err) {
      showApiError(err, 'salon.errors.deleteHolidayFailed')
    }
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

  if (loading) {
    return (
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (noSalonExists || !salon) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.salon')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('salon.notConfigured')}</p>
        </div>

        <Card>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>{t('salon.salonName')}</Label>
              <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('salon.phone')}</Label>
                <Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('salon.email')}</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('salon.address')}</Label>
              <Input value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('salon.description')}</Label>
              <Textarea rows={3} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => void handleCreateSalon()} disabled={saving}>
                {saving ? t('common.saving') : t('salon.createButton')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.salon')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('salon.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {holidaysSummary.map((h) => (
            <Badge key={h.id} variant="secondary">
              {formatDateOnlyLocale(h.date.slice(0, 10), locale)}: {h.name}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <div className="p-6">
          <Tabs defaultValue="general">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="general">{t('salon.tabs.general')}</TabsTrigger>
              <TabsTrigger value="hours">{t('salon.tabs.workingHours')}</TabsTrigger>
              <TabsTrigger value="holidays">{t('salon.tabs.holidays')}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('salon.salonName')}</Label>
                  <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.address')}</Label>
                  <Input value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.phone')}</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.email')}</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('salon.description')}</Label>
                  <Textarea rows={4} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('salon.pauseBetween')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(formData.pauseBetweenServices)}
                    onChange={(e) => setFormData((p) => ({ ...p, pauseBetweenServices: Number(e.target.value || 0) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.cancellationDeadline')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(formData.cancellationDeadlineHours)}
                    onChange={(e) => setFormData((p) => ({ ...p, cancellationDeadlineHours: Number(e.target.value || 0) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.reservationLock')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={String(formData.reservationLockMinutes)}
                    onChange={(e) => setFormData((p) => ({ ...p, reservationLockMinutes: Number(e.target.value || 0) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.maxCancellations')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(formData.maxCancellationsBeforePenalty)}
                    onChange={(e) => setFormData((p) => ({ ...p, maxCancellationsBeforePenalty: Number(e.target.value || 0) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('salon.penaltyDuration')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(formData.penaltyDurationDays)}
                    onChange={(e) => setFormData((p) => ({ ...p, penaltyDurationDays: Number(e.target.value || 0) }))}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button type="button" onClick={() => void handleSaveSettings()} disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <div className="app-table-wrap rounded-md border border-slate-200 dark:border-slate-800">
                <table className="app-table w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                      <th className="p-3 font-medium">{t('salon.workingHoursTable.day')}</th>
                      <th className="p-3 font-medium">{t('salon.workingHoursTable.workday')}</th>
                      <th className="p-3 font-medium">{t('salon.workingHoursTable.opens')}</th>
                      <th className="p-3 font-medium">{t('salon.workingHoursTable.closes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingHours.map((wh) => (
                      <tr key={wh.dayOfWeek} className={!wh.isWorkingDay ? 'opacity-60' : undefined}>
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{formatWeekday(wh.dayOfWeek, i18n.language)}</td>
                        <td className="p-3">
                          <Switch checked={wh.isWorkingDay} onCheckedChange={(checked) => updateWH(wh.dayOfWeek, 'isWorkingDay', checked)} />
                        </td>
                        <td className="p-3">
                          <Input
                            type="time"
                            className="h-9 w-[140px]"
                            value={wh.openTime}
                            disabled={!wh.isWorkingDay}
                            onChange={(e) => updateWH(wh.dayOfWeek, 'openTime', e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="time"
                            className="h-9 w-[140px]"
                            value={wh.closeTime}
                            disabled={!wh.isWorkingDay}
                            onChange={(e) => updateWH(wh.dayOfWeek, 'closeTime', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <Button type="button" onClick={() => void handleSaveWorkingHours()} disabled={saving}>
                  {saving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="holidays" className="mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{t('salon.holidays')}</p>
                  <p className="text-xs text-slate-500">{t('salon.holidaysDescription')}</p>
                </div>
                <Button type="button" onClick={() => openHolidayForm()}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('salon.newHoliday')}
                </Button>
              </div>

              {holidays.length === 0 ? (
                <p className="text-sm text-slate-500">{t('salon.noHolidays')}</p>
              ) : (
                <div className="app-table-wrap rounded-md border border-slate-200 dark:border-slate-800">
                  <table className="app-table w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                        <th className="p-3 font-medium">{t('salon.holidayTable.date')}</th>
                        <th className="p-3 font-medium">{t('salon.holidayTable.name')}</th>
                        <th className="p-3 font-medium">{t('salon.holidayTable.push')}</th>
                        <th className="p-3 font-medium">{t('salon.holidayTable.sent')}</th>
                        <th className="p-3 text-right font-medium">{t('salon.holidayTable.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holidays
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((h) => (
                          <tr key={h.id} className="border-b border-slate-100 dark:border-slate-800/80">
                            <td className="p-3">{formatDateOnlyLocale(h.date.slice(0, 10), locale)}</td>
                            <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{h.name}</td>
                            <td className="p-3">
                              <Badge variant={h.sendPush ? 'success' : 'secondary'}>{h.sendPush ? t('common.yes') : t('common.no')}</Badge>
                            </td>
                            <td className="p-3">{h.pushSentAt ? formatLocalizedDateTime(h.pushSentAt, i18n.language) : '—'}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-1">
                                {h.sendPush ? (
                                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('salon.sendNotification')} onClick={() => void handleSendNotification(h.id)}>
                                    <Send className="h-4 w-4 text-teal-600" aria-hidden="true" />
                                  </Button>
                                ) : null}
                                <Button type="button" size="sm" variant="ghost" onClick={() => openHolidayForm(h)}>
                                  {t('common.edit')}
                                </Button>
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('common.delete')} onClick={() => void handleDeleteHoliday(h.id)}>
                                  <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t(editHoliday ? 'salon.holidayForm.editTitle' : 'salon.holidayForm.newTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('salon.holidayForm.date')}</Label>
                <Input type="date" value={holForm.date} onChange={(e) => setHolForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('salon.holidayForm.name')}</Label>
                <Input value={holForm.name} onChange={(e) => setHolForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('salon.holidayForm.message')}</Label>
              <Textarea rows={3} value={holForm.message} onChange={(e) => setHolForm((p) => ({ ...p, message: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{t('salon.holidayForm.sendPush')}</p>
                <p className="text-xs text-slate-500">{t('salon.holidayForm.sendPushHint')}</p>
              </div>
              <Switch checked={holForm.sendPush} onCheckedChange={(checked) => setHolForm((p) => ({ ...p, sendPush: checked }))} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setHolidayOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSaveHoliday()} disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
