import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useStylistProfileMe } from '../hooks/useStylistProfileMe'
import {
  createDailyLogEntry,
  fetchActiveServices,
  fetchClientsForDailyLog,
  fetchLoyaltyInfoForClient,
} from '../api/stylist-workbook.api'
import type { ClientOption, LoyaltyInfo, ServiceOption } from '../types'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'

const formatKm = (v: number) => `${Number(v || 0).toFixed(2)} KM`

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(v)))

export const WorkbookNewEntryForm = ({
  mode,
  onClose,
}: {
  mode: 'page' | 'drawer'
  onClose?: () => void
}) => {
  const navigate = useNavigate()
  const { warning, success, toastApiError } = useAppToast()
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const [date, setDate] = useState(() => getSalonDateOnly())
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [clientId, setClientId] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [partialOpen, setPartialOpen] = useState(false)
  const [partialDiff, setPartialDiff] = useState(0)
  const [pendingPaidRaw, setPendingPaidRaw] = useState<number | null>(null)

  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState(0)
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

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([fetchActiveServices(), fetchClientsForDailyLog()])
      .then(([svc, cli]) => {
        if (!mounted) return
        setServices(svc)
        setClients(cli)
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as ServiceOption[],
    [services, serviceIds],
  )

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId],
  )

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    const base = selectedClient?.gender ? services.filter((s: any) => s.gender === selectedClient.gender) : services
    if (!q) return base
    return base.filter((s) => s.name.toLowerCase().includes(q))
  }, [services, serviceSearch, selectedClient?.gender])

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients.slice(0, 50)
    return clients
      .filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          (c.firstName?.toLowerCase().includes(q) ?? false) ||
          (c.lastName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 50)
  }, [clients, clientSearch])

  const basePrice = selectedServices.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
  const loyaltyPercent =
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
      ? Math.max(0, Math.min(desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent))
      : 0
  const loyaltyDiscountAmount = basePrice > 0 ? (basePrice * loyaltyPercent) / 100 : 0
  const chargeAmount = Math.max(0, basePrice - loyaltyDiscountAmount)

  useEffect(() => {
    if (serviceIds.length === 0 || !clientId) {
      setLoyaltyInfo(null)
      setDesiredLoyaltyPercent(0)
      return
    }
    let mounted = true
    setLoadingLoyalty(true)
    fetchLoyaltyInfoForClient({ clientId, serviceIds })
      .then((data) => {
        if (!mounted) return
        setLoyaltyInfo(data)
      })
      .catch(() => {
        if (!mounted) return
        setLoyaltyInfo(null)
      })
      .finally(() => {
        if (!mounted) return
        setLoadingLoyalty(false)
      })
    return () => {
      mounted = false
    }
  }, [serviceIds, clientId])

  const toggleService = (svc: ServiceOption) => {
    setServiceIds((prev) => {
      const exists = prev.includes(svc.id)
      return exists ? prev.filter((x) => x !== svc.id) : [...prev, svc.id]
    })
    setDesiredLoyaltyPercent(0)
    setPaidAmount('')
  }

  const handleSelectClient = (c: ClientOption) => {
    setClientId(c.id)
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username
    setClientSearch(name)
    setShowClientDropdown(false)
    if (c.gender && selectedServices.length > 0 && selectedServices.some((s: any) => (s as any).gender !== c.gender)) {
      setServiceIds([])
      setServiceSearch('')
    }
    setDesiredLoyaltyPercent(0)
    setPaidAmount('')
  }

  const handleSubmit = async () => {
    if (!profileId) {
      warning('Greška', 'Profil stilista nije pronađen.')
      return
    }
    if (!clientId) {
      warning('Greška', 'Odaberite klijenta.')
      return
    }
    if (!selectedClient?.gender) {
      warning('Greška', 'Klijent mora imati definisan spol.')
      return
    }
    if (serviceIds.length === 0) {
      warning('Greška', 'Odaberite servis(e).')
      return
    }
    const paidRaw = paidAmount.trim() ? Number(paidAmount.replace(',', '.')) : chargeAmount
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning('Greška', 'Unesite ispravan iznos naplaćenog računa.')
      return
    }
    if (paidRaw < chargeAmount) {
      setPendingPaidRaw(paidRaw)
      setPartialDiff(Math.max(0, chargeAmount - paidRaw))
      setPartialOpen(true)
      return
    }
    const tip = Math.max(0, paidRaw - chargeAmount)

    setSaving(true)
    try {
      const entry = await createDailyLogEntry({
        stylistProfileId: profileId,
        serviceIds,
        clientId,
        date,
        paidAmount: paidRaw,
        actualPrice: paidRaw,
        tipAmount: tip,
        notes: notes.trim() || undefined,
        isManual: true,
        debtHandling: 'IGNORE_DEBT',
        ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
      })
      success('Kreirano', 'Možete dodati before/after slike i završiti zapis u detalju.')
      onClose?.()
      navigate(`/stylist/workbook/${entry.id}`)
    } catch (err) {
      toastApiError(err, 'Greška pri kreiranju zapisa')
    } finally {
      setSaving(false)
    }
  }

  if (profileLoading || (loading && !profileId)) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden="true" />
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Nema profila</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Profil stilista nije pronađen.</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            onClose?.()
            navigate('/stylist/workbook')
          }}
        >
          Nazad
        </Button>
      </Card>
    )
  }

  return (
    <div className={mode === 'page' ? 'max-w-2xl' : ''}>
      {mode === 'page' ? (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Novi unos</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Nakon kreiranja možete dodati before/after slike i završiti zapis u detalju.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <Card className="p-4">
          <Label>Klijent</Label>
          <div ref={clientDropdownRef} className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={clientSearch}
              placeholder="Pretraži klijenta…"
              className="pl-9"
              onFocus={() => setShowClientDropdown(true)}
              onChange={(e) => {
                setClientSearch(e.target.value)
                setShowClientDropdown(true)
                setClientId('')
              }}
            />
            {showClientDropdown && filteredClients.length > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                {filteredClients.map((c) => (
                  <li
                    key={c.id}
                    className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => handleSelectClient(c)}
                  >
                    <p className="text-sm">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}</p>
                    <p className="text-xs text-slate-500">{c.username}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {selectedClient ? (
            <p className="mt-2 text-xs text-emerald-600">
              Odabrano: {[selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ') || selectedClient.username}
            </p>
          ) : null}
        </Card>

        <Card className="p-4">
          <Label>Servis</Label>
          {!selectedClient ? (
            <p className="mt-1 text-xs text-slate-500">Prvo odaberite klijenta da bi se prikazali servisi po spolu.</p>
          ) : !selectedClient.gender ? (
            <p className="mt-1 text-xs text-rose-600">Odabrani klijent nema definisan spol.</p>
          ) : null}
          <div ref={serviceDropdownRef} className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={serviceSearch}
              disabled={!selectedClient || !selectedClient.gender}
              placeholder={!selectedClient ? 'Odaberite klijenta…' : 'Pretraži servis…'}
              className="pl-9"
              onFocus={() => setShowServiceDropdown(true)}
              onChange={(e) => {
                setServiceSearch(e.target.value)
                setShowServiceDropdown(true)
              }}
            />
            {showServiceDropdown && filteredServices.length > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                {filteredServices.map((svc) => (
                  <li
                    key={svc.id}
                    className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => toggleService(svc)}
                  >
                    <div className="flex justify-between gap-2 text-sm">
                      <span>{svc.name}</span>
                      <span className="text-slate-500">{Number(svc.price).toFixed(2)} KM</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {selectedServices.length > 0 ? (
            <div className="mt-3 space-y-2">
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
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <Label>Datum</Label>
            <Input type="date" className="mt-2 max-w-[220px]" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>Naplaćeno (KM)</Label>
            <Input
              className="mt-2 max-w-[220px]"
              value={paidAmount}
              placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Servis: {formatKm(basePrice)}
              {loyaltyPercent > 0 ? ` · Loyalty popust: ${loyaltyPercent}% (${formatKm(loyaltyDiscountAmount)})` : ''}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
              Za naplatu: {formatKm(chargeAmount)}
            </div>
          </div>

          <div>
            <Label>Napomena (opciono)</Label>
            <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Loyalty</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {loadingLoyalty
                  ? 'Učitavanje…'
                  : loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
                    ? `Bodovi: ${loyaltyInfo.points ?? 0} · Max popust: ${loyaltyInfo.service.maxDiscountPercent}%`
                    : 'Loyalty nije dostupan za odabranog klijenta ili servis.'}
              </p>
            </div>
            {loadingLoyalty ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /> : null}
          </div>

          {loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service ? (
            <div className="mt-3">
              <Label>Popust (%)</Label>
              <Input
                type="number"
                className="mt-2 max-w-[140px]"
                min={0}
                max={loyaltyInfo.service.maxDiscountPercent}
                value={desiredLoyaltyPercent}
                onChange={(e) => {
                  const next = clampInt(Number(e.target.value) || 0, 0, loyaltyInfo.service?.maxDiscountPercent ?? 0)
                  setDesiredLoyaltyPercent(next)
                  setPaidAmount('')
                }}
              />
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Max iznos popusta: {formatKm(Number(loyaltyInfo.service.maxDiscountAmount ?? 0))}
              </p>
            </div>
          ) : null}
        </Card>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose?.()
              navigate('/stylist/workbook')
            }}
            disabled={saving}
          >
            Nazad
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Kreiram…
              </>
            ) : (
              'Kreiraj zapis'
            )}
          </Button>
        </div>
      </div>

      <Dialog
        open={partialOpen}
        onOpenChange={(v) => {
          if (!v) {
            setPartialOpen(false)
            return
          }
          setPartialOpen(true)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naplaćuje se manje nego što sistem zahtijeva</DialogTitle>
            <DialogDescription>
              Razlika iznosi {partialDiff.toFixed(2)} KM. Želite li da se ta razlika evidentira kao dug klijentu?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPartialOpen(false)} disabled={saving}>
              Odustani
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                const paidRaw = pendingPaidRaw
                if (paidRaw == null) return
                setPartialOpen(false)
                const tip = 0
                setSaving(true)
                try {
                  const entry = await createDailyLogEntry({
                    stylistProfileId: profileId!,
                    serviceIds,
                    clientId,
                    date,
                    paidAmount: paidRaw,
                    actualPrice: paidRaw,
                    tipAmount: tip,
                    notes: notes.trim() || undefined,
                    isManual: true,
                    debtHandling: 'IGNORE_DEBT',
                    ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
                  })
                  success('Kreirano', 'Zapis je kreiran.')
                  onClose?.()
                  navigate(`/stylist/workbook/${entry.id}`)
                } catch (err) {
                  toastApiError(err, 'Greška pri kreiranju zapisa')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              Ne zavodi dug
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const paidRaw = pendingPaidRaw
                if (paidRaw == null) return
                setPartialOpen(false)
                const tip = 0
                setSaving(true)
                try {
                  const entry = await createDailyLogEntry({
                    stylistProfileId: profileId!,
                    serviceIds,
                    clientId,
                    date,
                    paidAmount: paidRaw,
                    actualPrice: paidRaw,
                    tipAmount: tip,
                    notes: notes.trim() || undefined,
                    isManual: true,
                    debtHandling: 'CREATE_DEBT',
                    ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
                  })
                  success('Kreirano', `Zapis je kreiran, a ${partialDiff.toFixed(2)} KM je evidentirano kao dug.`)
                  onClose?.()
                  navigate(`/stylist/workbook/${entry.id}`)
                } catch (err) {
                  toastApiError(err, 'Greška pri kreiranju zapisa')
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              Zavedi dug
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const WorkbookNewEntryPage = () => {
  return <WorkbookNewEntryForm mode="page" />
}

export const WorkbookNewEntryDrawer = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="flex flex-col">
        <div className="h-full overflow-y-auto p-5">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Novi unos</p>
            <p className="text-xs text-slate-500">Brzi unos u dnevnu knjigu (stilist).</p>
          </div>
          <WorkbookNewEntryForm mode="drawer" onClose={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

