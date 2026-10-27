import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { formatLocalizedNumber, getIntlLocale } from '../../../i18n/locale-utils.mjs'

const formatKm = (v: number, locale: string) =>
  `${formatLocalizedNumber(Number(v || 0), locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(v)))

export const WorkbookNewEntryForm = ({
  mode,
  onClose,
}: {
  mode: 'page' | 'drawer'
  onClose?: () => void
}) => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
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
      warning(t('common.error'), t('stylistWorkbook.newEntry.profileNotFound'))
      return
    }
    if (!clientId) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.selectClient'))
      return
    }
    if (!selectedClient?.gender) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.clientGenderRequired'))
      return
    }
    if (serviceIds.length === 0) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.selectService'))
      return
    }
    const paidRaw = paidAmount.trim() ? Number(paidAmount.replace(',', '.')) : chargeAmount
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.invalidPaidAmount'))
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
      success(t('stylistWorkbook.newEntry.created'), t('stylistWorkbook.newEntry.createdDescription'))
      onClose?.()
      navigate(`/stylist/workbook/${entry.id}`)
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.newEntry.createFailed'))
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
        <p className="text-slate-900 dark:text-slate-50 font-semibold">{t('stylistWorkbook.newEntry.noProfile')}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('stylistWorkbook.newEntry.profileNotFound')}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => {
            onClose?.()
            navigate('/stylist/workbook')
          }}
        >
          {t('common.back')}
        </Button>
      </Card>
    )
  }

  return (
    <div className={mode === 'page' ? 'max-w-2xl' : ''}>
      {mode === 'page' ? (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('stylistWorkbook.newEntry.title')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t('stylistWorkbook.newEntry.pageDescription')}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        <Card className="p-4">
          <Label>{t('stylistWorkbook.newEntry.client')}</Label>
          <div ref={clientDropdownRef} className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={clientSearch}
              placeholder={t('stylistWorkbook.newEntry.searchClient')}
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
              {t('stylistWorkbook.newEntry.selectedClient', { client: [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ') || selectedClient.username })}
            </p>
          ) : null}
        </Card>

        <Card className="p-4">
          <Label>{t('stylistWorkbook.newEntry.service')}</Label>
          {!selectedClient ? (
            <p className="mt-1 text-xs text-slate-500">{t('stylistWorkbook.newEntry.selectClientForServices')}</p>
          ) : !selectedClient.gender ? (
            <p className="mt-1 text-xs text-rose-600">{t('stylistWorkbook.newEntry.clientGenderRequired')}</p>
          ) : null}
          <div ref={serviceDropdownRef} className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              value={serviceSearch}
              disabled={!selectedClient || !selectedClient.gender}
              placeholder={!selectedClient ? t('stylistWorkbook.newEntry.selectClient') : t('stylistWorkbook.newEntry.searchService')}
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
                      <span className="text-slate-500">{formatKm(Number(svc.price), locale)}</span>
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
                    <div className="text-xs text-slate-500">{formatKm(Number(s.price), locale)}</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => toggleService(s)}>
                    {t('common.delete')}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-4 space-y-3">
          <div>
            <Label>{t('stylistWorkbook.newEntry.date')}</Label>
            <Input type="date" className="mt-2 max-w-[220px]" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <Label>{t('stylistWorkbook.newEntry.paidAmount')}</Label>
            <Input
              className="mt-2 max-w-[220px]"
              value={paidAmount}
              placeholder={formatLocalizedNumber(chargeAmount, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t('stylistWorkbook.newEntry.serviceTotal', { amount: formatKm(basePrice, locale) })}
              {loyaltyPercent > 0 ? ` · ${t('stylistWorkbook.newEntry.loyaltyDiscount', { percent: formatLocalizedNumber(loyaltyPercent, locale, { maximumFractionDigits: 0 }), amount: formatKm(loyaltyDiscountAmount, locale) })}` : ''}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t('stylistWorkbook.newEntry.amountDue', { amount: formatKm(chargeAmount, locale) })}
            </div>
          </div>

          <div>
            <Label>{t('stylistWorkbook.newEntry.notesOptional')}</Label>
            <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('stylistWorkbook.newEntry.loyalty')}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {loadingLoyalty
                  ? t('common.loading')
                  : loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
                    ? t('stylistWorkbook.newEntry.loyaltySummary', { points: formatLocalizedNumber(loyaltyInfo.points ?? 0, locale, { maximumFractionDigits: 0 }), percent: formatLocalizedNumber(loyaltyInfo.service.maxDiscountPercent, locale, { maximumFractionDigits: 0 }) })
                    : t('stylistWorkbook.newEntry.loyaltyUnavailable')}
              </p>
            </div>
            {loadingLoyalty ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden="true" /> : null}
          </div>

          {loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service ? (
            <div className="mt-3">
              <Label>{t('stylistWorkbook.newEntry.discountPercent')}</Label>
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
                {t('stylistWorkbook.newEntry.maxDiscountAmount', { amount: formatKm(Number(loyaltyInfo.service.maxDiscountAmount ?? 0), locale) })}
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
            {t('common.back')}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('stylistWorkbook.newEntry.creating')}
              </>
            ) : (
              t('stylistWorkbook.newEntry.createEntry')
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
            <DialogTitle>{t('stylistWorkbook.newEntry.partialPaymentTitle')}</DialogTitle>
            <DialogDescription>
              {t('stylistWorkbook.newEntry.partialPaymentDescription', { amount: formatKm(partialDiff, locale) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPartialOpen(false)} disabled={saving}>
              {t('common.cancel')}
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
                  success(t('stylistWorkbook.newEntry.created'), t('stylistWorkbook.newEntry.entryCreated'))
                  onClose?.()
                  navigate(`/stylist/workbook/${entry.id}`)
                } catch (err) {
                  toastApiError(err, t('stylistWorkbook.newEntry.createFailed'))
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {t('stylistWorkbook.newEntry.ignoreDebt')}
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
                  success(t('stylistWorkbook.newEntry.created'), t('stylistWorkbook.newEntry.createdWithDebt', { amount: formatKm(partialDiff, locale) }))
                  onClose?.()
                  navigate(`/stylist/workbook/${entry.id}`)
                } catch (err) {
                  toastApiError(err, t('stylistWorkbook.newEntry.createFailed'))
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {t('stylistWorkbook.newEntry.recordDebt')}
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
  const { t } = useTranslation()

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="flex flex-col">
        <div className="h-full overflow-y-auto p-5">
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('stylistWorkbook.newEntry.title')}</p>
            <p className="text-xs text-slate-500">{t('stylistWorkbook.newEntry.drawerDescription')}</p>
          </div>
          <WorkbookNewEntryForm mode="drawer" onClose={() => onOpenChange(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  )
}

