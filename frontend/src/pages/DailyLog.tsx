import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import api from '../api/client'
import { useAppToast } from '../lib/toast/useAppToast'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Switch } from '../components/ui/switch'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { DailyLogEntryTable } from '../features/daily-log/entry-table'
import { DailyLogEntryFormDialog } from '../features/daily-log/entry-form-dialog'
import { DailyLogDeleteDialog } from '../features/daily-log/entry-delete-dialog'
import type {
  ClientOption,
  DailyLogEntry,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
  StylistOption,
} from '../features/daily-log/types'
import { getStylistName } from '../features/daily-log/types'

interface PaginatedResponse<T> {
  items: T[]
  total: number
}

const emptyForm = (): DailyLogFormState => ({
  stylistProfileId: '',
  serviceIds: [],
  clientId: '',
  date: new Date().toISOString().slice(0, 10),
  actualPrice: 0,
  tipAmount: 0,
  notes: '',
  isManual: true,
  desiredLoyaltyPercent: 0,
  status: 'PENDING',
})

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
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [stylists, setStylists] = useState<StylistOption[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<DailyLogFormState>(emptyForm)
  const [paidAmount, setPaidAmount] = useState('')
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)
  const [partialOpen, setPartialOpen] = useState(false)
  const [partialDiff, setPartialDiff] = useState(0)
  const [pendingPaidRaw, setPendingPaidRaw] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DailyLogEntry | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

  const loadData = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (stylistFilter) params.stylistProfileId = stylistFilter
    if (includeDeleted) params.includeDeleted = '1'
    api
      .get<DailyLogEntry[]>('/api/daily-log', { params })
      .then((r) => setEntries(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [fromDate, toDate, stylistFilter, includeDeleted])

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
        if (isMounted) setLoyaltyInfo(r.data)
      })
      .catch(() => {
        if (isMounted) setLoyaltyInfo(null)
      })
      .finally(() => {
        if (isMounted) setLoadingLoyalty(false)
      })
    return () => {
      isMounted = false
    }
  }, [form.serviceIds, form.clientId])

  const activeEntries = entries.filter((e) => !e.deletedAt)
  const totalRevenue = activeEntries.reduce((sum, e) => sum + Number(e.actualPrice || 0), 0)
  const totalTips = activeEntries.reduce((sum, e) => sum + Number(e.tipAmount || 0), 0)
  const completedCount = activeEntries.filter((e) => e.status === 'COMPLETED').length

  const openCreateForm = () => {
    setEditId(null)
    setForm(emptyForm())
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
      status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
    })
    setPaidAmount(entry.actualPrice != null ? String(Number(entry.actualPrice)) : '')
    setOpen(true)
  }

  const computeCharge = () => {
    const selected = form.serviceIds
      .map((id) => services.find((s) => s.id === id))
      .filter(Boolean) as ServiceOption[]
    const base = selected.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
    const loyaltyPercent =
      loyaltyInfo?.enabled &&
      loyaltyInfo?.hasAccount &&
      loyaltyInfo?.redeemEnabled &&
      loyaltyInfo?.service
        ? Math.max(
            0,
            Math.min(form.desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent),
          )
        : 0
    const discount = base > 0 ? (base * loyaltyPercent) / 100 : 0
    return {
      chargeAmount: Math.max(0, base - discount),
      loyaltyPercent,
    }
  }

  const handleSave = async () => {
    if (!form.stylistProfileId || form.serviceIds.length === 0) {
      warning('Odaberite stilistu i servis')
      return
    }
    const { chargeAmount, loyaltyPercent } = computeCharge()
    const paidRaw =
      paidAmount.trim().length > 0 ? Number(paidAmount.replace(',', '.')) : chargeAmount
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning('Unesite ispravan iznos naplaćenog računa')
      return
    }
    if (!editId && paidRaw < chargeAmount) {
      setPendingPaidRaw(paidRaw)
      setPartialDiff(Math.max(0, chargeAmount - paidRaw))
      setPartialOpen(true)
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
          date: form.date,
          stylistProfileId: form.stylistProfileId,
          serviceIds: form.serviceIds,
          clientId: form.clientId || null,
          status: form.status,
          ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
        })
      } else {
        await api.post('/api/daily-log', {
          stylistProfileId: form.stylistProfileId,
          serviceIds: form.serviceIds,
          clientId: form.clientId || undefined,
          date: form.date,
          paidAmount: paidRaw,
          actualPrice: paidRaw,
          tipAmount: tipAuto,
          notes: form.notes || undefined,
          isManual: true,
          debtHandling: 'IGNORE_DEBT',
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

  const confirmPartial = async (debtHandling: 'CREATE_DEBT' | 'IGNORE_DEBT') => {
    if (pendingPaidRaw == null) return
    const { loyaltyPercent } = computeCharge()
    setSaving(true)
    try {
      await api.post('/api/daily-log', {
        stylistProfileId: form.stylistProfileId,
        serviceIds: form.serviceIds,
        clientId: form.clientId || undefined,
        date: form.date,
        paidAmount: pendingPaidRaw,
        actualPrice: pendingPaidRaw,
        tipAmount: 0,
        notes: form.notes || undefined,
        isManual: true,
        debtHandling,
        ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
      })
      success('Sačuvano')
      loadData()
      setPartialOpen(false)
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

  const handleDelete = async () => {
    if (!deleteTarget || !deleteReason.trim()) return
    setSaving(true)
    try {
      await api.delete(`/api/daily-log/${deleteTarget.id}`, {
        data: { reason: deleteReason.trim() },
      })
      success('Unos obrisan')
      setDeleteTarget(null)
      setDeleteReason('')
      loadData()
    } catch {
      error('Greška pri brisanju')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await api.post(`/api/daily-log/${id}/restore`)
      success('Unos vraćen')
      loadData()
    } catch {
      error('Greška pri vraćanju')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {t('nav.dailyLog')}
        </h1>
        <Button type="button" onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Novi Unos
        </Button>
      </div>
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatMini title="Ukupno prihoda" value={`${totalRevenue.toFixed(2)} KM`} />
        <StatMini title="Ukupno napojnica" value={`${totalTips.toFixed(2)} KM`} />
        <StatMini title="Kompletirano" value={`${completedCount} / ${activeEntries.length}`} />
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
        <div className="flex items-center gap-2 pb-1">
          <Switch
            id="include-deleted"
            checked={includeDeleted}
            onCheckedChange={setIncludeDeleted}
          />
          <Label htmlFor="include-deleted" className="text-sm">
            Prikaži obrisane
          </Label>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setFromDate('')
            setToDate('')
            setStylistFilter('')
            setIncludeDeleted(false)
          }}
        >
          Resetuj
        </Button>
      </div>
      <DailyLogEntryTable
        entries={entries}
        loading={loading}
        noDataLabel={t('common.noData')}
        onEdit={openEditForm}
        onComplete={(id) => void handleComplete(id)}
        onDelete={(entry) => {
          setDeleteTarget(entry)
          setDeleteReason('')
        }}
        onRestore={(id) => void handleRestore(id)}
      />
      <DailyLogEntryFormDialog
        open={open}
        onOpenChange={setOpen}
        editId={editId}
        form={form}
        setForm={setForm}
        stylists={stylists}
        services={services}
        clients={clients}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        loyaltyInfo={loyaltyInfo}
        loadingLoyalty={loadingLoyalty}
        saving={saving}
        onSave={() => void handleSave()}
        cancelLabel={t('common.cancel')}
        saveLabel={t('common.save')}
      />
      <DailyLogDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
        entry={deleteTarget}
        reason={deleteReason}
        onReasonChange={setDeleteReason}
        saving={saving}
        onConfirm={() => void handleDelete()}
      />
      <Dialog open={partialOpen} onOpenChange={setPartialOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naplaćuje se manje nego što sistem zahtijeva</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Razlika iznosi {partialDiff.toFixed(2)} KM. Želite li da se ta razlika evidentira kao dug
            klijentu?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPartialOpen(false)} disabled={saving}>
              Odustani
            </Button>
            <Button type="button" variant="outline" onClick={() => void confirmPartial('IGNORE_DEBT')} disabled={saving}>
              Ne zavodi dug
            </Button>
            <Button type="button" onClick={() => void confirmPartial('CREATE_DEBT')} disabled={saving}>
              Zavedi dug
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
