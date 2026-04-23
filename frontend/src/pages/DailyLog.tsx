import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Check, Loader2, Pencil, Plus, Search } from 'lucide-react'
import api from '../api/client'
import { useAppToast } from '../lib/toast/useAppToast'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

interface DailyLogEntry {
  id: string
  date: string
  actualPrice: number | string
  tipAmount: number | string
  loyaltyDiscountPercent?: number
  loyaltyDiscountAmount?: number | string
  loyaltyPointsUsed?: number
  isManual: boolean
  notes: string | null
  status: string
  completedAt: string | null
  stylistProfile?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } }
  service?: { id: string; name: string }
  items?: Array<{ id: string; sortOrder: number; serviceId: string; service?: { id: string; name: string } | null }>
  client?: { id: string; firstName: string | null; lastName: string | null; user?: { username: string } }
  reservation?: {
    id: string
    loyaltyDiscountPercent: number
    loyaltyDiscountAmount: number | string
  } | null
}

interface StylistOption {
  id: string
  user?: { username: string; firstName: string | null; lastName: string | null }
}

interface ServiceOption {
  id: string
  name: string
  price: number | string
  gender?: 'MALE' | 'FEMALE'
}

interface ClientOption {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender?: 'MALE' | 'FEMALE'
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type LoyaltyInfo = {
  enabled: boolean
  hasAccount: boolean
  redeemEnabled?: boolean
  points?: number
  tier?: string | null
  tierMaxDiscountPercent?: number
  globalMaxDiscountPercent?: number
  minPointsToRedeem?: number
  redeemRate?: number
  service?: {
    id: string
    price: number
    maxDiscountPercent: number
    maxDiscountAmount: number
    maxUsablePoints: number
  } | null
}

const StatMini = ({ title, value }: { title: string; value: string }) => (
  <Card className="p-4">
    <p className="text-xs text-slate-500">{title}</p>
    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
  </Card>
)

export default function DailyLog() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()
  const [entries, setEntries] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [stylistFilter, setStylistFilter] = useState('')

  const [stylists, setStylists] = useState<StylistOption[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [form, setForm] = useState({
    stylistProfileId: '',
    serviceIds: [] as string[],
    clientId: '',
    date: new Date().toISOString().slice(0, 10),
    actualPrice: 0,
    tipAmount: 0,
    notes: '',
    isManual: true,
    desiredLoyaltyPercent: 0,
  })
  const [paidAmount, setPaidAmount] = useState<string>('')
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)

  const [serviceSearch, setServiceSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null)
  const clientDropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (
        showServiceDropdown &&
        serviceDropdownRef.current &&
        target &&
        !serviceDropdownRef.current.contains(target)
      ) {
        setShowServiceDropdown(false)
      }
      if (
        showClientDropdown &&
        clientDropdownRef.current &&
        target &&
        !clientDropdownRef.current.contains(target)
      ) {
        setShowClientDropdown(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowServiceDropdown(false)
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [showServiceDropdown, showClientDropdown])

  const loadData = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (stylistFilter) params.stylistProfileId = stylistFilter
    api
      .get<DailyLogEntry[]>('/api/daily-log', { params })
      .then((r) => setEntries(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [fromDate, toDate, stylistFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    api
      .get<StylistOption[] | PaginatedResponse<StylistOption>>('/api/stylists', {
        params: { page: 0, pageSize: 200 },
      })
      .then((r) =>
        setStylists(Array.isArray(r.data) ? r.data : Array.isArray(r.data.items) ? r.data.items : []),
      )
      .catch(() => {})
    api
      .get<ServiceOption[] | PaginatedResponse<ServiceOption>>('/api/services', {
        params: { activeOnly: true, page: 0, pageSize: 300 },
      })
      .then((r) =>
        setServices(Array.isArray(r.data) ? r.data : Array.isArray(r.data.items) ? r.data.items : []),
      )
      .catch(() => {})
    api
      .get<ClientOption[] | PaginatedResponse<ClientOption>>('/api/users', {
        params: { page: 0, pageSize: 500 },
      })
      .then((r) =>
        setClients(Array.isArray(r.data) ? r.data : Array.isArray(r.data.items) ? r.data.items : []),
      )
      .catch(() => {})
  }, [])

  const totalRevenue = entries.reduce((sum, e) => sum + Number(e.actualPrice || 0), 0)
  const totalTips = entries.reduce((sum, e) => sum + Number(e.tipAmount || 0), 0)
  const completedCount = entries.filter((e) => e.status === 'COMPLETED').length

  const filteredServices = useMemo(() => {
    const selectedClient = clients.find((c) => c.id === form.clientId)
    const base = selectedClient?.gender ? services.filter((s) => s.gender === selectedClient.gender) : services
    if (!serviceSearch) return base
    const q = serviceSearch.toLowerCase()
    return base.filter((s) => s.name.toLowerCase().includes(q))
  }, [clients, form.clientId, services, serviceSearch])

  const isServiceSelected = useCallback(
    (id: string) => form.serviceIds.includes(id),
    [form.serviceIds],
  )

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 20)
    const q = clientSearch.toLowerCase()
    return clients
      .filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          (c.firstName?.toLowerCase().includes(q) ?? false) ||
          (c.lastName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 20)
  }, [clients, clientSearch])

  const toggleService = (svc: ServiceOption) => {
    if (!form.clientId) {
      warning('Prvo odaberite klijenta')
      setShowClientDropdown(true)
      return
    }
    setForm((prev) => {
      const exists = prev.serviceIds.includes(svc.id)
      const nextIds = exists ? prev.serviceIds.filter((x) => x !== svc.id) : [...prev.serviceIds, svc.id]
      return { ...prev, serviceIds: nextIds, desiredLoyaltyPercent: 0 }
    })
    setShowServiceDropdown(true)
    setPaidAmount('')
  }

  const selectClient = (client: ClientOption) => {
    setForm((prev) => {
      const currentSelected = prev.serviceIds
        .map((id) => services.find((s) => s.id === id))
        .filter(Boolean) as ServiceOption[]
      const hasMismatch =
        client.gender &&
        currentSelected.length > 0 &&
        currentSelected.some((s) => s.gender && s.gender !== client.gender)

      return {
        ...prev,
        clientId: client.id,
        desiredLoyaltyPercent: 0,
        serviceIds: hasMismatch ? [] : prev.serviceIds,
      }
    })
    const name = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.username
    setClientSearch(name)
    setShowClientDropdown(false)
    setServiceSearch('')
    setPaidAmount('')
  }

  const openCreateForm = () => {
    setEditId(null)
    setForm({
      stylistProfileId: '',
      serviceIds: [],
      clientId: '',
      date: new Date().toISOString().slice(0, 10),
      actualPrice: 0,
      tipAmount: 0,
      notes: '',
      isManual: true,
      desiredLoyaltyPercent: 0,
    })
    setServiceSearch('')
    setClientSearch('')
    setLoyaltyInfo(null)
    setPaidAmount('')
    setOpen(true)
  }

  const openEditForm = (entry: DailyLogEntry) => {
    setEditId(entry.id)
    const serviceIds =
      Array.isArray(entry.items) && entry.items.length > 0
        ? entry.items.map((x) => x.serviceId)
        : entry.service?.id
          ? [entry.service.id]
          : []
    setForm({
      stylistProfileId: entry.stylistProfile?.id ?? '',
      serviceIds,
      clientId: entry.client?.id ?? '',
      date: entry.date?.slice(0, 10) ?? '',
      actualPrice: Number(entry.actualPrice),
      tipAmount: Number(entry.tipAmount),
      notes: entry.notes ?? '',
      isManual: entry.isManual,
      desiredLoyaltyPercent: Number(entry.loyaltyDiscountPercent ?? 0),
    })
    setServiceSearch('')
    const clientName = entry.client
      ? [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') || entry.client.user?.username || ''
      : ''
    setClientSearch(clientName)
    setPaidAmount(entry.actualPrice != null ? String(Number(entry.actualPrice)) : '')
    setOpen(true)
  }

  const selectedServices = useMemo(
    () => form.serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as ServiceOption[],
    [services, form.serviceIds],
  )
  const basePrice = selectedServices.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
  const loyaltyPercent =
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
      ? Math.max(0, Math.min(form.desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent))
      : 0
  const loyaltyDiscountAmount = basePrice > 0 ? (basePrice * loyaltyPercent) / 100 : 0
  const chargeAmount = Math.max(0, basePrice - loyaltyDiscountAmount)

  useEffect(() => {
    if (form.serviceIds.length === 0 || !form.clientId) {
      setLoyaltyInfo(null)
      return
    }
    let isMounted = true
    setLoadingLoyalty(true)
    api
      .get<LoyaltyInfo>(`/api/loyalty/stylist/client/${form.clientId}`, {
        params: { serviceIds: form.serviceIds.join(',') },
      })
      .then((r) => {
        if (!isMounted) return
        setLoyaltyInfo(r.data)
      })
      .catch(() => {
        if (!isMounted) return
        setLoyaltyInfo(null)
      })
      .finally(() => {
        if (!isMounted) return
        setLoadingLoyalty(false)
      })
    return () => {
      isMounted = false
    }
  }, [form.serviceIds, form.clientId])

  const handleSave = async () => {
    if (!form.stylistProfileId || form.serviceIds.length === 0) {
      warning('Odaberite stilistu i servis')
      return
    }
    const paidRaw =
      paidAmount.trim().length > 0 ? Number(paidAmount.replace(',', '.')) : chargeAmount
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning('Unesite ispravan iznos naplaćenog računa')
      return
    }
    if (paidRaw < chargeAmount) {
      warning(`Naplaćeno ne može biti manje od za naplatu (${chargeAmount.toFixed(2)} KM)`)
      return
    }
    const tipAuto = Math.max(0, paidRaw - chargeAmount)
    setSaving(true)
    try {
      if (editId) {
        await api.patch(`/api/daily-log/${editId}`, {
          actualPrice: paidRaw,
          tipAmount: tipAuto,
          notes: form.notes || undefined,
          ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
        })
      } else {
        await api.post('/api/daily-log', {
          stylistProfileId: form.stylistProfileId,
          serviceIds: form.serviceIds,
          clientId: form.clientId || undefined,
          date: form.date,
          actualPrice: paidRaw,
          tipAmount: tipAuto,
          notes: form.notes || undefined,
          isManual: true,
          ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
        })
      }
      success('Sačuvano')
      loadData()
      setOpen(false)
    } catch {
      error('Greška')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/api/daily-log/${id}/complete`)
      success('Unos kompletiran i prihod dodan u knjigu')
      loadData()
    } catch {
      error('Greška')
    }
  }

  const getStylistName = (s?: StylistOption | DailyLogEntry['stylistProfile']) => {
    if (!s?.user) return '-'
    return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username
  }

  const loyaltyLine = (e: DailyLogEntry) => {
    if (e.reservation && e.reservation.loyaltyDiscountPercent > 0) {
      return (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Loyalty popust: {e.reservation.loyaltyDiscountPercent}% ({Number(e.reservation.loyaltyDiscountAmount ?? 0).toFixed(2)}{' '}
          KM)
        </p>
      )
    }
    if (!e.reservation && Number(e.loyaltyDiscountPercent ?? 0) > 0) {
      return (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Loyalty popust: {Number(e.loyaltyDiscountPercent)}% ({Number(e.loyaltyDiscountAmount ?? 0).toFixed(2)} KM)
        </p>
      )
    }
    return null
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.dailyLog')}</h1>
        <Button type="button" onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Novi Unos
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatMini title="Ukupno prihoda" value={`${totalRevenue.toFixed(2)} KM`} />
        <StatMini title="Ukupno napojnica" value={`${totalTips.toFixed(2)} KM`} />
        <StatMini title="Kompletirano" value={`${completedCount} / ${entries.length}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div>
          <p className="mb-1 text-xs text-slate-500">Od datuma</p>
          <Input type="date" className="h-9 w-[160px]" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">Do datuma</p>
          <Input type="date" className="h-9 w-[160px]" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs text-slate-500">Stilista</p>
          <select
            value={stylistFilter}
            onChange={(e) => setStylistFilter(e.target.value)}
            className="flex h-9 w-[200px] rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
          >
            <option value="">Svi stilisti</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>
                {getStylistName(s)}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setFromDate('')
            setToDate('')
            setStylistFilter('')
          }}
        >
          Resetuj
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" aria-hidden="true" />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-3 lg:hidden">
              {entries.length === 0 ? (
                <p className="text-slate-500">{t('common.noData')}</p>
              ) : (
                entries.map((e) => (
                  <div key={e.id} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-900 dark:text-slate-50">{e.date?.slice(0, 10)}</p>
                      <Badge variant={e.status === 'COMPLETED' ? 'success' : 'warning'} className="text-[10px]">
                        {e.status === 'COMPLETED' ? 'Kompletiran' : 'Na čekanju'}
                      </Badge>
                    </div>
                    <p className="text-sm">{e.service?.name ?? '-'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{getStylistName(e.stylistProfile)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-medium">{Number(e.actualPrice).toFixed(2)} KM</p>
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Uredi" onClick={() => openEditForm(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {e.status !== 'COMPLETED' ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600"
                            aria-label="Kompletiraj"
                            onClick={() => void handleComplete(e.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left dark:border-slate-800">
                    <th className="p-3 font-medium">Datum</th>
                    <th className="p-3 font-medium">Stilista</th>
                    <th className="p-3 font-medium">Servis</th>
                    <th className="p-3 font-medium">Klijent</th>
                    <th className="p-3 text-right font-medium">Cijena</th>
                    <th className="p-3 text-right font-medium">Napojnica</th>
                    <th className="p-3 font-medium">Izvor</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 text-right font-medium">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-slate-500">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    entries.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/80">
                        <td className="p-3">{e.date?.slice(0, 10)}</td>
                        <td className="p-3">
                          {e.stylistProfile?.id ? (
                            <RouterLink
                              to={`/admin/stylist-analytics?stylistId=${e.stylistProfile.id}`}
                              className="font-medium text-brand-gold hover:underline"
                            >
                              {getStylistName(e.stylistProfile)}
                            </RouterLink>
                          ) : (
                            getStylistName(e.stylistProfile)
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-0">
                            <span>{e.service?.name ?? '-'}</span>
                            {loyaltyLine(e)}
                          </div>
                        </td>
                        <td className="p-3">
                          {e.client ? (
                            <RouterLink
                              to={`/admin/client-analytics?userId=${e.client.id}`}
                              className="text-brand-gold hover:underline"
                            >
                              {[e.client.firstName, e.client.lastName].filter(Boolean).join(' ') || e.client.user?.username || '-'}
                            </RouterLink>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 text-right font-medium tabular-nums">{Number(e.actualPrice).toFixed(2)}</td>
                        <td className="p-3 text-right tabular-nums">{Number(e.tipAmount).toFixed(2)}</td>
                        <td className="p-3">
                          <Badge variant={e.isManual ? 'warning' : 'secondary'} className="text-[10px]">
                            {e.isManual ? 'Ručno' : 'Rezervacija'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={e.status === 'COMPLETED' ? 'success' : 'warning'} className="text-[10px]">
                            {e.status === 'COMPLETED' ? 'Kompletiran' : 'Na čekanju'}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Uredi" onClick={() => openEditForm(e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {e.status !== 'COMPLETED' ? (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-emerald-600"
                                aria-label="Kompletiraj"
                                onClick={() => void handleComplete(e.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Uredi Unos' : 'Novi Unos u Dnevnu Knjigu'}</DialogTitle>
          </DialogHeader>

          {!editId ? (
            <div className="space-y-4">
              <div>
                <Label>Stilista</Label>
                <select
                  required
                  value={form.stylistProfileId}
                  onChange={(e) => setForm({ ...form, stylistProfileId: e.target.value })}
                  className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <option value="">Odaberite stilistu</option>
                  {stylists.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getStylistName(s)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Klijent</Label>
                <div ref={clientDropdownRef} className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      setShowClientDropdown(true)
                      setForm((prev) => ({ ...prev, clientId: '' }))
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder="Pretražite klijenta..."
                  />
                  {showClientDropdown && filteredClients.length > 0 ? (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                      {filteredClients.map((c) => (
                        <li
                          key={c.id}
                          className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => selectClient(c)}
                        >
                          <p className="text-sm">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}</p>
                          <p className="text-xs text-slate-500">{c.username}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {form.clientId ? <p className="mt-1 text-xs text-emerald-600">Odabrano: {clientSearch}</p> : null}
              </div>

              <div>
                <Label>Servis</Label>
                {!form.clientId ? (
                  <p className="mt-1 text-xs text-slate-500">Prvo odaberite klijenta da bi se prikazali servisi po spolu.</p>
                ) : null}
                <div ref={serviceDropdownRef} className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    value={serviceSearch}
                    disabled={!form.clientId}
                    onChange={(e) => {
                      setServiceSearch(e.target.value)
                      setShowServiceDropdown(true)
                    }}
                    onFocus={() => setShowServiceDropdown(true)}
                    placeholder={!form.clientId ? 'Odaberite klijenta...' : 'Pretražite servis...'}
                  />
                  {showServiceDropdown && filteredServices.length > 0 ? (
                    <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                      {filteredServices.map((svc) => (
                        <li
                          key={svc.id}
                          className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => toggleService(svc)}
                        >
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2">
                              {isServiceSelected(svc.id) ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                              {svc.name}
                            </span>
                            <span className="text-slate-500">{Number(svc.price).toFixed(2)} KM</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {form.serviceIds.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedServices.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-50">{s.name}</div>
                          <div className="text-xs text-slate-500">{Number(s.price).toFixed(2)} KM</div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => toggleService(s)}>
                          Ukloni
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div>
                <Label>Datum</Label>
                <Input type="date" className="mt-1" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Naplaćeno (KM)</Label>
              <Input
                className="mt-1"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
              />
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Servis: {Number.isFinite(basePrice) ? basePrice.toFixed(2) : '0.00'} KM
                {loyaltyPercent > 0 ? ` · Loyalty: ${loyaltyPercent}% (${loyaltyDiscountAmount.toFixed(2)} KM)` : ''}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-50">Za naplatu: {chargeAmount.toFixed(2)} KM</p>
            </div>
          </div>

          <div>
            <Label>Bilješke</Label>
            <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <Label className="mb-2 block">Loyalty</Label>
            {loadingLoyalty ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service ? (
              <div className="space-y-2">
                <p className="text-sm">
                  Bodovi: {loyaltyInfo.points ?? 0} · Max popust: {loyaltyInfo.service.maxDiscountPercent}%
                </p>
                <div>
                  <Label className="text-sm">Popust (%)</Label>
                  <Input
                    type="number"
                    className="mt-1 max-w-[140px]"
                    min={0}
                    max={loyaltyInfo.service.maxDiscountPercent}
                    value={form.desiredLoyaltyPercent}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0
                      const max = loyaltyInfo.service?.maxDiscountPercent ?? 0
                      setForm((prev) => ({
                        ...prev,
                        desiredLoyaltyPercent: Math.max(0, Math.min(v, max)),
                      }))
                    }}
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Max iznos popusta: {Number(loyaltyInfo.service.maxDiscountAmount ?? 0).toFixed(2)} KM
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-400">Loyalty nije dostupan za odabranog klijenta ili servis.</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Čuvam...
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
