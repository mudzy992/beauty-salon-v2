import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
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

const formatKm = (v: number) => `${Number(v || 0).toFixed(2)} KM`

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(v)))

export const WorkbookNewEntryPage = () => {
  const navigate = useNavigate()
  const { warning, success, toastApiError } = useAppToast()
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [serviceId, setServiceId] = useState('')
  const [clientId, setClientId] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [notes, setNotes] = useState('')

  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState(0)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)

  const [serviceSearch, setServiceSearch] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)

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

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  )

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId],
  )

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    if (!q) return services
    return services.filter((s) => s.name.toLowerCase().includes(q))
  }, [services, serviceSearch])

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

  const basePrice = selectedService ? Number(selectedService.price ?? 0) : 0
  const loyaltyPercent =
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
      ? Math.max(0, Math.min(desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent))
      : 0
  const loyaltyDiscountAmount = basePrice > 0 ? (basePrice * loyaltyPercent) / 100 : 0
  const chargeAmount = Math.max(0, basePrice - loyaltyDiscountAmount)

  useEffect(() => {
    if (!serviceId || !clientId) {
      setLoyaltyInfo(null)
      setDesiredLoyaltyPercent(0)
      return
    }
    let mounted = true
    setLoadingLoyalty(true)
    fetchLoyaltyInfoForClient({ clientId, serviceId })
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
  }, [serviceId, clientId])

  const handleSelectService = (svc: ServiceOption) => {
    setServiceId(svc.id)
    setServiceSearch(svc.name)
    setShowServiceDropdown(false)
    setDesiredLoyaltyPercent(0)
    setPaidAmount('')
  }

  const handleSelectClient = (c: ClientOption) => {
    setClientId(c.id)
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username
    setClientSearch(name)
    setShowClientDropdown(false)
    setDesiredLoyaltyPercent(0)
    setPaidAmount('')
  }

  const handleSubmit = async () => {
    if (!profileId) {
      warning('Greška', 'Profil stilista nije pronađen.')
      return
    }
    if (!serviceId || !clientId) {
      warning('Greška', 'Odaberite servis i klijenta.')
      return
    }
    const paidRaw = paidAmount.trim() ? Number(paidAmount.replace(',', '.')) : chargeAmount
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning('Greška', 'Unesite ispravan iznos naplaćenog računa.')
      return
    }
    if (paidRaw < chargeAmount) {
      warning('Greška', `Naplaćeni iznos ne može biti manji od iznosa za naplatu (${chargeAmount.toFixed(2)} KM).`)
      return
    }
    const tip = Math.max(0, paidRaw - chargeAmount)

    setSaving(true)
    try {
      const entry = await createDailyLogEntry({
        stylistProfileId: profileId,
        serviceId,
        clientId,
        date,
        actualPrice: paidRaw,
        tipAmount: tip,
        notes: notes.trim() || undefined,
        isManual: true,
        ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
      })
      success('Kreirano', 'Možete dodati before/after slike i završiti zapis u detalju.')
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
        <Button type="button" variant="outline" className="mt-4" onClick={() => navigate('/stylist/workbook')}>
          Nazad
        </Button>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Novi unos</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Nakon kreiranja možete dodati before/after slike i završiti zapis u detalju.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <Label>Servis</Label>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={serviceSearch}
              placeholder="Pretraži servis…"
              className="pl-9"
              onFocus={() => setShowServiceDropdown(true)}
              onChange={(e) => {
                setServiceSearch(e.target.value)
                setShowServiceDropdown(true)
                setServiceId('')
              }}
            />
            {showServiceDropdown && filteredServices.length > 0 ? (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                {filteredServices.map((svc) => (
                  <li
                    key={svc.id}
                    className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => handleSelectService(svc)}
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
          {selectedService ? (
            <p className="mt-2 text-xs text-emerald-600">Odabrano: {selectedService.name}</p>
          ) : null}
        </Card>

        <Card className="p-4">
          <Label>Klijent</Label>
          <div className="relative mt-2">
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
          <Button type="button" variant="outline" onClick={() => navigate('/stylist/workbook')} disabled={saving}>
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
    </div>
  )
}

