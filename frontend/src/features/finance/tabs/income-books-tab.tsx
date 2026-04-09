import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Eye, Loader2, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../../../api/client'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { Badge } from '../../../components/ui/badge'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { MONTHS, getEndOfMonthDate, formatDateBs } from '../finance.utils'
import type {
  ClientOption,
  IncomeBook,
  IncomeBookManualEntry,
  IncomeEntry,
  ServiceOption,
  StylistOption,
} from '../finance.types'

export function IncomeBooksTab() {
  const { t } = useTranslation()
  const { success, warning, toastApiError } = useAppToast()

  const [books, setBooks] = useState<IncomeBook[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonthBook, setCurrentMonthBook] = useState<IncomeBook | null>(null)
  const [selectedBook, setSelectedBook] = useState<IncomeBook | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<IncomeEntry | null>(null)
  const [view, setView] = useState<'list' | 'book' | 'entry'>('list')

  const nowForPicker = useRef<Date>(new Date())
  const [targetYear, setTargetYear] = useState<number>(nowForPicker.current.getFullYear())
  const [targetMonth, setTargetMonth] = useState<number>(nowForPicker.current.getMonth() + 1)

  const [isUnlockOpen, setIsUnlockOpen] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [locking, setLocking] = useState(false)

  const [services, setServices] = useState<ServiceOption[]>([])
  const [loadingServices, setLoadingServices] = useState(false)
  const [servicesForStylistId, setServicesForStylistId] = useState<string | null>(null)

  const [stylists, setStylists] = useState<StylistOption[]>([])
  const [loadingStylists, setLoadingStylists] = useState(false)
  const [stylistsLoadAttempted, setStylistsLoadAttempted] = useState(false)

  const [clientQuery, setClientQuery] = useState('')
  const [clientResults, setClientResults] = useState<ClientOption[]>([])
  const [clientSearching, setClientSearching] = useState(false)
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const [clientDebts, setClientDebts] = useState<
    {
      id: string
      amount: number | string
      note?: string | null
      createdAt: string
      service?: { id: string; name: string } | null
      createdBy?: { id: string; username: string } | null
    }[]
  >([])
  const [clientDebtsLoading, setClientDebtsLoading] = useState(false)

  const [isManualOpen, setIsManualOpen] = useState(false)
  const [editingManual, setEditingManual] = useState<IncomeBookManualEntry | null>(null)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualForm, setManualForm] = useState({
    date: '',
    stylistProfileId: '',
    clientId: '',
    serviceId: '',
    servicePrice: 0,
    paidAmount: 0,
    debtHandling: 'IGNORE_DEBT' as 'CREATE_DEBT' | 'IGNORE_DEBT',
    notes: '',
  })

  const loadData = useCallback(() => {
    setLoading(true)
    api
      .get<IncomeBook[]>('/api/income-books')
      .then((r) => setBooks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    api
      .get<IncomeBook>(`/api/income-books/month/${year}/${month}`)
      .then((r) => setCurrentMonthBook(r.data))
      .catch(() => setCurrentMonthBook(null))
  }, [])

  const openMonth = async (year: number, month: number) => {
    try {
      const { data } = await api.get<IncomeBook>(`/api/income-books/month/${year}/${month}`)
      setSelectedBook(data)
      setView('book')
      loadData()
    } catch {
      toastApiError(new Error('Failed to open month'), 'Greška')
    }
  }

  const openBook = async (b: IncomeBook) => {
    try {
      const { data } = await api.get<IncomeBook>(`/api/income-books/${b.id}`)
      setSelectedBook(data)
      setView('book')
    } catch {
      toastApiError(new Error('Failed to open book'), 'Greška')
    }
  }

  const reloadSelectedBook = async () => {
    if (!selectedBook) return
    try {
      const { data } = await api.get<IncomeBook>(`/api/income-books/${selectedBook.id}`)
      setSelectedBook(data)
      loadData()
    } catch {}
  }

  const loadServices = useCallback(async () => {
    setLoadingServices(true)
    try {
      if (!manualForm.stylistProfileId) {
        setServices([])
        return
      }
      const { data } = await api.get(`/api/stylists/${manualForm.stylistProfileId}/services`)
      const list = Array.isArray(data) ? data : []
      const svc = list
        .map((row: any) => row?.service)
        .filter(Boolean)
        .map((s: any) => ({ id: s.id, name: s.name, price: s.price, gender: s.gender }))
      setServices(svc)
      setServicesForStylistId(manualForm.stylistProfileId)
    } catch {
      setServices([])
    } finally {
      setLoadingServices(false)
    }
  }, [manualForm.stylistProfileId])

  const loadStylists = useCallback(async () => {
    setLoadingStylists(true)
    try {
      const { data } = await api.get('/api/stylists', {
        params: { activeOnly: 'true', pageSize: 200, page: 0 },
      })
      const items = Array.isArray((data as any)?.items) ? (data as any).items : Array.isArray(data) ? data : []
      setStylists(items)
    } catch {
      setStylists([])
    } finally {
      setLoadingStylists(false)
      setStylistsLoadAttempted(true)
    }
  }, [])

  useEffect(() => {
    if (view !== 'book' || !selectedBook) return
    if (!manualForm.stylistProfileId) return
    if (servicesForStylistId === manualForm.stylistProfileId) return
    if (loadingServices) return
    loadServices()
  }, [loadServices, loadingServices, manualForm.stylistProfileId, selectedBook, servicesForStylistId, view])

  useEffect(() => {
    if (view !== 'book' || !selectedBook) return
    if (stylistsLoadAttempted || loadingStylists) return
    loadStylists()
  }, [loadStylists, loadingStylists, selectedBook, stylistsLoadAttempted, view])

  useEffect(() => {
    if (view !== 'book' || !selectedBook) return
    const isUnlocked = !selectedBook.closedAt
    if (!isUnlocked) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [selectedBook, view])

  const openManualCreate = () => {
    if (!selectedBook) return
    setEditingManual(null)
    const y = selectedBook.year
    const m = String(selectedBook.month).padStart(2, '0')
    const defaultStylistId = stylists[0]?.id ?? ''
    setManualForm({
      date: `${y}-${m}-01`,
      stylistProfileId: defaultStylistId,
      clientId: '',
      serviceId: '',
      servicePrice: 0,
      paidAmount: 0,
      debtHandling: 'IGNORE_DEBT',
      notes: '',
    })
    setSelectedClient(null)
    setClientQuery('')
    setClientResults([])
    setIsManualOpen(true)
  }

  const openManualEdit = (entry: IncomeBookManualEntry) => {
    setEditingManual(entry)
    const svc = services.find((s) => s.id === entry.serviceId)
    const servicePrice = svc?.price != null ? Number(svc.price) : Number(entry.amount || 0)
    const paidAmount = Number(entry.amount || 0) + Number(entry.tipAmount || 0)
    setManualForm({
      date: String(entry.date).slice(0, 10),
      stylistProfileId: entry.stylistProfileId ?? '',
      clientId: (entry as any).clientId ?? '',
      serviceId: entry.serviceId,
      servicePrice,
      paidAmount,
      debtHandling: 'IGNORE_DEBT',
      notes: entry.notes ?? '',
    })
    const client = (entry as any).client as ClientOption | undefined
    setSelectedClient(client ?? null)
    const label = client ? [client.firstName, client.lastName].filter(Boolean).join(' ') || client.username : ''
    setClientQuery(label)
    setClientResults([])
    setIsManualOpen(true)
  }

  const selectedServicePrice = (() => {
    const svc = services.find((s) => s.id === manualForm.serviceId)
    const price = svc?.price != null ? Number(svc.price) : manualForm.servicePrice
    return Number.isFinite(price) ? price : 0
  })()

  const computedTipAmount = Math.max(
    0,
    Number(manualForm.paidAmount || 0) - Number(selectedServicePrice || 0),
  )

  const computedDebtAmount = Math.max(0, Number(selectedServicePrice || 0) - Number(manualForm.paidAmount || 0))

  const selectedClientGender: 'MALE' | 'FEMALE' | null = selectedClient?.gender ?? null

  const filteredServices = selectedClientGender ? services.filter((s) => s.gender === selectedClientGender) : []

  const handleSaveManual = async () => {
    if (!selectedBook) return
    if (!manualForm.date || !manualForm.stylistProfileId || !manualForm.clientId || !manualForm.serviceId) {
      warning('Popunite sva polja')
      return
    }
    setManualSaving(true)
    try {
      if (editingManual) {
        await api.patch(
          `/api/income-books/${selectedBook.id}/manual-entries/${editingManual.id}`,
          {
            date: manualForm.date,
            stylistProfileId: manualForm.stylistProfileId,
            clientId: manualForm.clientId || null,
            serviceId: manualForm.serviceId,
            paidAmount: manualForm.paidAmount,
            debtHandling: computedDebtAmount > 0 ? manualForm.debtHandling : undefined,
            notes: manualForm.notes || null,
          },
        )
      } else {
        await api.post(`/api/income-books/${selectedBook.id}/manual-entries`, {
          date: manualForm.date,
          stylistProfileId: manualForm.stylistProfileId,
          clientId: manualForm.clientId || undefined,
          serviceId: manualForm.serviceId,
          paidAmount: manualForm.paidAmount,
          debtHandling: computedDebtAmount > 0 ? manualForm.debtHandling : undefined,
          notes: manualForm.notes || undefined,
        })
      }
      success('Sačuvano')
      setIsManualOpen(false)
      await reloadSelectedBook()
    } catch {
      toastApiError(new Error('Failed to save'), 'Greška')
    } finally {
      setManualSaving(false)
    }
  }

  const handleDeleteManual = async (entry: IncomeBookManualEntry) => {
    if (!selectedBook) return
    if (!window.confirm('Obrisati ručni prihod?')) return
    try {
      await api.delete(`/api/income-books/${selectedBook.id}/manual-entries/${entry.id}`)
      success('Obrisano')
      await reloadSelectedBook()
    } catch {
      toastApiError(new Error('Failed to delete'), 'Greška')
    }
  }

  useEffect(() => {
    if (!isManualOpen) return
    const q = clientQuery.trim()
    if (q.length < 2) {
      setClientResults([])
      return
    }
    const handle = window.setTimeout(() => {
      setClientSearching(true)
      api
        .get('/api/users/clients', { params: { q, page: 0, pageSize: 20 } })
        .then((r) => {
          const items = Array.isArray((r.data as any)?.items)
            ? (r.data as any).items
            : Array.isArray(r.data)
              ? r.data
              : []
          setClientResults(items)
        })
        .catch(() => setClientResults([]))
        .finally(() => setClientSearching(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [clientQuery, isManualOpen])

  useEffect(() => {
    if (!isManualOpen) return
    const clientId = manualForm.clientId?.trim()
    if (!clientId) {
      setClientDebts([])
      return
    }
    setClientDebtsLoading(true)
    api
      .get('/api/client-debts', { params: { clientId } })
      .then((r) => {
        setClientDebts(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => setClientDebts([]))
      .finally(() => setClientDebtsLoading(false))
  }, [isManualOpen, manualForm.clientId])

  const handleSettleDebt = async (debtId: string) => {
    try {
      await api.patch(`/api/client-debts/${debtId}/settle`, {})
      success('Dug je označen kao vraćen')
      const clientId = manualForm.clientId?.trim()
      if (clientId) {
        const { data } = await api.get('/api/client-debts', { params: { clientId } })
        setClientDebts(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      toastApiError(err, 'Greška')
    }
  }

  const handleUnlockBook = async () => {
    if (!selectedBook) return
    const reason = unlockReason.trim()
    if (!reason) {
      warning('Unesite razlog otključavanja')
      return
    }
    setUnlocking(true)
    try {
      await api.post(`/api/income-books/${selectedBook.id}/unlock`, { reason })
      success('Knjiga otključana')
      setUnlockReason('')
      setIsUnlockOpen(false)
      await reloadSelectedBook()
    } catch {
      toastApiError(new Error('Failed to unlock'), 'Greška')
    } finally {
      setUnlocking(false)
    }
  }

  const handleLockBook = async () => {
    if (!selectedBook) return
    setLocking(true)
    try {
      await api.post(`/api/income-books/${selectedBook.id}/lock`)
      success('Knjiga zaključana')
      await reloadSelectedBook()
    } catch {
      toastApiError(new Error('Failed to lock'), 'Greška')
    } finally {
      setLocking(false)
    }
  }

  const openCurrentMonth = async () => {
    const now = new Date()
    await openMonth(now.getFullYear(), now.getMonth() + 1)
  }

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, i) => nowForPicker.current.getFullYear() - 2 + i),
    [],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-600 dark:text-slate-300">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const currentBook = currentMonthBook ?? books.find((b) => b.year === currentYear && b.month === currentMonth) ?? null
  const isCurrentBookOpen = Boolean(currentBook && !currentBook.closedAt)
  const currentMonthEnd = getEndOfMonthDate(currentYear, currentMonth)

  if (view === 'entry' && selectedEntry) {
    const dl = selectedEntry.dailyLogEntry
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setView('book')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na knjigu
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Detalji dnevnog prihoda</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pregled</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Datum</div>
              <div className="font-medium text-slate-900 dark:text-slate-50">{selectedEntry.date?.slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Iznos</div>
              <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                {Number(selectedEntry.amount).toFixed(2)} KM
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Napojnica</div>
              <div className="font-medium text-slate-900 dark:text-slate-50">{Number(selectedEntry.tipAmount).toFixed(2)} KM</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Izvor</div>
              <div className="pt-1">
                <Badge variant="secondary">{dl?.isManual ? 'Ručno' : 'Iz rezervacije'}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === 'book' && selectedBook) {
    const isLocked = Boolean(selectedBook.closedAt)
    const manualEntries = selectedBook.manualEntries ?? []
    const canEditManual = !isLocked
    const manualTotal = manualEntries.reduce((sum, e) => sum + Number(e.amount || 0), 0)
    const manualTipsTotal = manualEntries.reduce((sum, e) => sum + Number(e.tipAmount || 0), 0)
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            if (!isLocked) {
              warning('Knjiga je otključana', 'Prije izlaska morate zaključati knjigu.')
              return
            }
            setView('list')
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na listu
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Knjiga prihoda: {MONTHS[selectedBook.month]} {selectedBook.year}
            </div>
            <div>
              <Badge variant={isLocked ? 'secondary' : 'default'} className={isLocked ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'}>
                {isLocked ? 'Zaključana' : 'Otključana'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLocked ? (
              <Button variant="outline" onClick={() => setIsUnlockOpen(true)}>
                Otključaj
              </Button>
            ) : (
              <Button
                className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                variant="outline"
                onClick={() => void handleLockBook()}
                disabled={locking}
              >
                {locking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Zaključi
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Ukupni prihod</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                {Number(selectedBook.totalRevenue).toFixed(2)} KM
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">Ukupne napojnice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                {Number(selectedBook.totalTips).toFixed(2)} KM
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Zapisi</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="p-3">Datum</th>
                  <th className="p-3">Servis</th>
                  <th className="p-3">Stilista</th>
                  <th className="p-3 text-right">Iznos</th>
                  <th className="p-3 text-right">Napojnica</th>
                  <th className="p-3 text-right">Detalji</th>
                </tr>
              </thead>
              <tbody>
                {(selectedBook.entries ?? []).length === 0 ? (
                  <tr>
                    <td className="p-3 text-slate-500 dark:text-slate-400" colSpan={6}>
                      Nema zapisa.
                    </td>
                  </tr>
                ) : (
                  (selectedBook.entries ?? []).map((e) => (
                    <tr
                      key={e.id}
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                      onClick={() => {
                        setSelectedEntry(e)
                        setView('entry')
                      }}
                    >
                      <td className="p-3">{e.date?.slice(0, 10)}</td>
                      <td className="p-3">{e.dailyLogEntry?.service?.name ?? '-'}</td>
                      <td className="p-3">{e.dailyLogEntry?.stylistProfile?.user?.username ?? '-'}</td>
                      <td className="p-3 text-right font-medium">{Number(e.amount).toFixed(2)}</td>
                      <td className="p-3 text-right">{Number(e.tipAmount).toFixed(2)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-50">Ručni prihodi</div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Prihod: {manualTotal.toFixed(2)} KM</Badge>
            <Badge variant="secondary">Napojnice: {manualTipsTotal.toFixed(2)} KM</Badge>
            {canEditManual ? (
              <Button onClick={openManualCreate} disabled={loadingServices}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj ručni prihod
              </Button>
            ) : null}
          </div>
        </div>

        <Card>
          <CardContent className="overflow-x-auto pt-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="p-3">Datum</th>
                  <th className="p-3">Klijent</th>
                  <th className="p-3">Servis</th>
                  <th className="p-3 text-right">Iznos</th>
                  <th className="p-3 text-right">Napojnica</th>
                  <th className="p-3">Bilješke</th>
                  <th className="p-3 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {manualEntries.length === 0 ? (
                  <tr>
                    <td className="p-3 text-slate-500 dark:text-slate-400" colSpan={7}>
                      Nema ručnih prihoda.
                    </td>
                  </tr>
                ) : (
                  manualEntries.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="p-3">{String(e.date).slice(0, 10)}</td>
                      <td className="p-3">{((e as any).client?.firstName ?? '') + ' ' + ((e as any).client?.lastName ?? '')}</td>
                      <td className="p-3">{e.service?.name ?? '-'}</td>
                      <td className="p-3 text-right font-medium">{Number(e.amount).toFixed(2)}</td>
                      <td className="p-3 text-right">{Number(e.tipAmount).toFixed(2)}</td>
                      <td className="p-3">{e.notes ?? '-'}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => openManualEdit(e)}
                            disabled={!canEditManual}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/20"
                            onClick={() => void handleDeleteManual(e)}
                            disabled={!canEditManual}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Dialog open={isUnlockOpen} onOpenChange={setIsUnlockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Otključaj knjigu</DialogTitle>
              <DialogDescription>Molimo unesite razlog otključavanja. Ova akcija će biti evidentirana.</DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="unlockReason">Razlog</Label>
              <Textarea id="unlockReason" value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} rows={3} />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUnlockOpen(false)}>
                Odustani
              </Button>
              <Button onClick={() => void handleUnlockBook()} disabled={unlocking}>
                {unlocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Otključaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingManual ? 'Uredi ručni prihod' : 'Novi ručni prihod'}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Datum</Label>
                <Input
                  id="date"
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stylist">Stilista</Label>
                <select
                  id="stylist"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:ring-offset-slate-950"
                  value={manualForm.stylistProfileId}
                  onChange={(e) => {
                    const stylistProfileId = e.target.value
                    setManualForm((p) => ({
                      ...p,
                      stylistProfileId,
                      serviceId: '',
                      servicePrice: 0,
                      paidAmount: 0,
                      clientId: '',
                    }))
                    setSelectedClient(null)
                    setClientQuery('')
                    setClientResults([])
                    if (stylistProfileId && stylistProfileId !== servicesForStylistId) {
                      setServices([])
                      void loadServices()
                    }
                  }}
                  disabled={loadingStylists}
                >
                  <option value="" disabled>
                    Odaberite stilistu
                  </option>
                  {stylists.map((s) => {
                    const u = s.user
                    const label = u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username : s.id
                    return (
                      <option key={s.id} value={s.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="client">Klijent</Label>
                <div className="relative">
                  <Input
                    id="client"
                    value={clientQuery}
                    placeholder="Pretraži klijenta (min 2 slova)"
                    onChange={(e) => {
                      const v = e.target.value
                      setClientQuery(v)
                      setSelectedClient(null)
                      setManualForm((p) => ({ ...p, clientId: '' }))
                    }}
                  />
                  {selectedClient || clientQuery ? (
                    <button
                      type="button"
                      aria-label="Očisti"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                      onClick={() => {
                        setClientQuery('')
                        setSelectedClient(null)
                        setClientResults([])
                        setManualForm((p) => ({ ...p, clientId: '' }))
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {clientSearching || clientResults.length > 0 ? (
                  <div className="mt-2 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    {clientSearching ? (
                      <div className="p-2 text-sm text-slate-500 dark:text-slate-400">Pretraga...</div>
                    ) : (
                      clientResults.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="block w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          onClick={() => {
                            setSelectedClient(c)
                            setClientQuery([c.firstName, c.lastName].filter(Boolean).join(' ') || c.username)
                            setManualForm((p) => ({ ...p, clientId: c.id }))
                            setClientResults([])
                          }}
                        >
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{c.username}</div>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">Dugovanja klijenta</div>
                  {clientDebtsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Učitavanje...
                    </div>
                  ) : null}
                </div>
                {!manualForm.clientId ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400">Odaberite klijenta da vidite dugovanja.</div>
                ) : clientDebts.length === 0 ? (
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">Nema otvorenih dugovanja.</div>
                ) : (
                  <div className="space-y-2">
                    {clientDebts.map((d) => (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-50">
                            {Number(d.amount).toFixed(2)} KM
                            {d.service?.name ? <span className="ml-2 text-xs text-slate-500">• {d.service.name}</span> : null}
                          </div>
                          {d.note ? <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{d.note}</div> : null}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => void handleSettleDebt(d.id)}>
                          Označi vraćen
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="service">Servis</Label>
                <select
                  id="service"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:ring-offset-slate-950"
                  value={manualForm.serviceId}
                  onChange={(e) => {
                    const serviceId = e.target.value
                    const svc = services.find((s) => s.id === serviceId)
                    const servicePrice = svc?.price != null ? Number(svc.price) : 0
                    setManualForm((p) => ({
                      ...p,
                      serviceId,
                      servicePrice,
                      paidAmount: servicePrice,
                      debtHandling: 'IGNORE_DEBT',
                    }))
                  }}
                  disabled={loadingServices || !manualForm.stylistProfileId || !selectedClientGender}
                >
                  <option value="" disabled>
                    {selectedClientGender ? 'Odaberite servis' : 'Odaberite klijenta (spol)'}
                  </option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="paid">Uplaćeno (KM)</Label>
                <Input
                  id="paid"
                  type="number"
                  value={manualForm.paidAmount}
                  onChange={(e) => setManualForm((p) => ({ ...p, paidAmount: Number(e.target.value) || 0 }))}
                />
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Cijena servisa: {selectedServicePrice.toFixed(2)} KM • Napojnica: {computedTipAmount.toFixed(2)} KM
                </div>
              </div>

              {computedDebtAmount > 0 ? (
                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/30 md:col-span-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                    Naplaćeno je manje od cijene servisa. Razlika: {computedDebtAmount.toFixed(2)} KM
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                      <input
                        type="radio"
                        name="debtHandling"
                        checked={manualForm.debtHandling === 'CREATE_DEBT'}
                        onChange={() => {
                          if (!manualForm.clientId) {
                            warning('Odaberite klijenta da biste zaveli dug')
                            return
                          }
                          setManualForm((p) => ({ ...p, debtHandling: 'CREATE_DEBT' }))
                        }}
                      />
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900 dark:text-slate-50">Zavedi kao dug</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Dug će biti vidljiv admin/owner i stilisti koji ga je zaveo, te može biti označen kao vraćen kasnije.
                        </div>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                      <input
                        type="radio"
                        name="debtHandling"
                        checked={manualForm.debtHandling === 'IGNORE_DEBT'}
                        onChange={() => setManualForm((p) => ({ ...p, debtHandling: 'IGNORE_DEBT' }))}
                      />
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900 dark:text-slate-50">Uredu je, ne zavodi kao dug</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Razlika se neće evidentirati.</div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Bilješke</Label>
                <Textarea
                  id="notes"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsManualOpen(false)}>
                Odustani
              </Button>
              <Button onClick={() => void handleSaveManual()} disabled={manualSaving}>
                {manualSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sačuvaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isCurrentBookOpen ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
              Otvoreno
            </Badge>
            <div className="text-sm text-slate-600 dark:text-slate-300">
              Knjiga za tekući mjesec {MONTHS[currentMonth]} {currentYear} je otvorena do {formatDateBs(currentMonthEnd)}.
            </div>
          </div>
        ) : (
          <Button onClick={() => void openCurrentMonth()}>
            <Plus className="mr-2 h-4 w-4" />
            Otvori tekući mjesec
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={targetYear}
            onChange={(e) => setTargetYear(Number(e.target.value) || targetYear)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            value={targetMonth}
            onChange={(e) => setTargetMonth(Number(e.target.value) || targetMonth)}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {MONTHS[m]}
              </option>
            ))}
          </select>
          <Button variant="outline" onClick={() => void openMonth(targetYear, targetMonth)}>
            Otvori
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto pt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="p-3">Godina</th>
                <th className="p-3">Mjesec</th>
                <th className="p-3">Otvorena</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td className="p-3 text-slate-500 dark:text-slate-400" colSpan={5}>
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                books.map((b) => (
                  <tr
                    key={b.id}
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                    onClick={() => void openBook(b)}
                  >
                    <td className="p-3">{b.year}</td>
                    <td className="p-3">{MONTHS[b.month]}</td>
                    <td className="p-3">{new Date(b.openedAt).toLocaleDateString('bs-BA')}</td>
                    <td className="p-3">
                      <Badge
                        className={
                          b.closedAt
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                        }
                      >
                        {b.closedAt ? 'Zatvorena' : 'Otvorena'}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

