import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppToast } from '../../../lib/toast/useAppToast'
import { useStylistProfileMe } from './useStylistProfileMe'
import {
  createDailyLogEntry,
  fetchActiveServices,
  fetchClientsForDailyLog,
  fetchLoyaltyInfoForClient,
} from '../api/stylist-workbook.api'
import type { ClientOption, LoyaltyInfo, ServiceOption } from '../types'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'
import { formatKm } from '../workbook-amount'

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(v)))

/**
 * Usluga iz javnog kataloga.
 *
 * Backend `/api/services` (`toPublicService`) vraća `gender` za svaku uslugu, ali
 * `ServiceOption` u `../types.ts` ga ne deklariše. Fajl `types.ts` je zaštićen
 * (faza §3: „data/logika BEZ IZMJENE"), pa se polje dodaje **lokalnim**
 * proširenjem — ponašanje je identično ranijem `(s: any).gender` pristupu,
 * samo bez `any`.
 */
export type CatalogService = ServiceOption & { gender?: 'MALE' | 'FEMALE' | null }

/** Rezultat slanja — stranica odlučuje o `onClose`/navigaciji. */
export type NewEntrySubmitResult = { created: false } | { created: true; entryId: string }

/**
 * Stanje i tok formule za novi unos u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene ponašanja**:
 * isti redoslijed poziva, isti payload (`createDailyLogEntry`), ista zaštita od
 * zastarjelih odgovora (`clientLoadGeneration`), ista validacija i iste poruke.
 *
 * API sloj (`api/stylist-workbook.api.ts`) NIJE diran — ovo je prezentacioni
 * izdvajanje.
 */
export const useWorkbookNewEntryForm = () => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { warning, success, toastApiError } = useAppToast()
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [services, setServices] = useState<CatalogService[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const [date, setDate] = useState(() => getSalonDateOnly())
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null)
  const clientId = selectedClient?.id ?? ''
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
  // `useRef<HTMLDivElement>(null)` daje `RefObject<HTMLDivElement>` — isti tip
  // koji očekuju DOM `ref` atributi (`RefObject<T>` je invarijantan u `T`, pa
  // `RefObject<HTMLDivElement | null>` nije prilagodljiv `ref` propu).
  const serviceDropdownRef = useRef<HTMLDivElement>(null)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const clientLoadGeneration = useRef(0)

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
    fetchActiveServices()
      .then((svc) => {
        if (mounted) setServices(svc as CatalogService[])
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  // Zaštita od zastarjelih odgovora: samo posljednji zahtjev smije ažurirati listu.
  useEffect(() => {
    if (selectedClient) return
    let active = true
    const timer = setTimeout(() => {
      const generation = ++clientLoadGeneration.current
      fetchClientsForDailyLog(clientSearch)
        .then((items) => {
          if (active && clientLoadGeneration.current === generation) {
            setClients(items)
          }
        })
        .catch(() => {})
    }, clientSearch.trim() ? 250 : 0)
    return () => {
      active = false
      clearTimeout(timer)
      clientLoadGeneration.current += 1
    }
  }, [clientSearch, selectedClient])

  const selectedServices = useMemo(
    () => serviceIds.map((id) => services.find((s) => s.id === id)).filter(Boolean) as CatalogService[],
    [services, serviceIds],
  )

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase()
    const base = selectedClient?.gender
      ? services.filter((s) => s.gender === selectedClient.gender)
      : services
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
    setSelectedClient(c)
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username
    setClientSearch(name)
    setShowClientDropdown(false)
    if (
      c.gender &&
      selectedServices.length > 0 &&
      selectedServices.some((s) => s.gender !== c.gender)
    ) {
      setServiceIds([])
      setServiceSearch('')
    }
    setDesiredLoyaltyPercent(0)
    setPaidAmount('')
  }

  /** Pretraga klijenta briše prethodni odabir (i usluge, i popust). */
  const handleClientSearchChange = (value: string) => {
    setClientSearch(value)
    setShowClientDropdown(true)
    setSelectedClient(null)
    setServiceIds([])
    setServiceSearch('')
    setDesiredLoyaltyPercent(0)
    setPaidAmount('')
  }

  /** Promjena pretrage usluga ne mijenja odabir. */
  const handleServiceSearchChange = (value: string) => {
    setServiceSearch(value)
    setShowServiceDropdown(true)
  }

  /** Zadržava odabrani popust unutar dozvoljenog maksimuma. */
  const handleDesiredLoyaltyPercentChange = (value: number) => {
    const next = clampInt(
      Number(value) || 0,
      0,
      loyaltyInfo?.service?.maxDiscountPercent ?? 0,
    )
    setDesiredLoyaltyPercent(next)
    setPaidAmount('')
  }

  /**
   * Zajednički payload. Razlikuje se samo `debtHandling` i napojnica:
   * potpuno plaćenje nosi višak kao napojnicu, a djelimično plaćenje dug ne
   * stvara napojnicu (`tip = 0`) — isto kao prije izdvajanja.
   */
  const buildEntryPayload = (paidRaw: number, debtHandling: 'IGNORE_DEBT' | 'CREATE_DEBT', tip: number) => ({
    stylistProfileId: profileId!,
    serviceIds,
    clientId,
    date,
    paidAmount: paidRaw,
    actualPrice: paidRaw,
    tipAmount: tip,
    notes: notes.trim() || undefined,
    // `as const` zadržava literalni tip `true` — bez njega bi TS proširio `isManual`
    // na `boolean`, a API (`createDailyLogEntry`) zahtijeva doslovno `true`.
    isManual: true as const,
    debtHandling,
    ...(loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}),
  })

  const handleSubmit = async (): Promise<NewEntrySubmitResult> => {
    if (!profileId) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.profileNotFound'))
      return { created: false }
    }
    if (!clientId) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.selectClient'))
      return { created: false }
    }
    if (!selectedClient?.gender) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.clientGenderRequired'))
      return { created: false }
    }
    if (serviceIds.length === 0) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.selectService'))
      return { created: false }
    }
    const paidRaw = paidAmount.trim() ? Number(paidAmount.replace(',', '.')) : chargeAmount
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning(t('common.error'), t('stylistWorkbook.newEntry.invalidPaidAmount'))
      return { created: false }
    }
    if (paidRaw < chargeAmount) {
      setPendingPaidRaw(paidRaw)
      setPartialDiff(Math.max(0, chargeAmount - paidRaw))
      setPartialOpen(true)
      return { created: false }
    }
    const tip = Math.max(0, paidRaw - chargeAmount)

    setSaving(true)
    try {
      const entry = await createDailyLogEntry(buildEntryPayload(paidRaw, 'IGNORE_DEBT', tip))
      success(t('stylistWorkbook.newEntry.created'), t('stylistWorkbook.newEntry.createdDescription'))
      return { created: true, entryId: entry.id }
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.newEntry.createFailed'))
      return { created: false }
    } finally {
      setSaving(false)
    }
  }

  /**
   * Djelimično plaćenje: isti payload, ali `debtHandling` određuje da li se dug
   * zanemaruje ili bilježi. Poruka o uspjehu se razlikuje po putanji, kao i prije
   * izdvajanja (`entryCreated` vs `createdWithDebt`).
   */
  const confirmPartialPayment = async (
    debtHandling: 'IGNORE_DEBT' | 'CREATE_DEBT',
  ): Promise<NewEntrySubmitResult> => {
    const paidRaw = pendingPaidRaw
    if (paidRaw == null) return { created: false }
    setPartialOpen(false)
    const tip = 0
    setSaving(true)
    try {
      const entry = await createDailyLogEntry(buildEntryPayload(paidRaw, debtHandling, tip))
      success(
        t('stylistWorkbook.newEntry.created'),
        debtHandling === 'CREATE_DEBT'
          ? t('stylistWorkbook.newEntry.createdWithDebt', { amount: formatKm(partialDiff, locale) })
          : t('stylistWorkbook.newEntry.entryCreated'),
      )
      return { created: true, entryId: entry.id }
    } catch (err) {
      toastApiError(err, t('stylistWorkbook.newEntry.createFailed'))
      return { created: false }
    } finally {
      setSaving(false)
    }
  }

  return {
    profileId,
    profileLoading,
    loading,
    saving,
    services,
    clients,
    date,
    setDate,
    serviceIds,
    selectedClient,
    clientId,
    paidAmount,
    setPaidAmount,
    notes,
    setNotes,
    partialOpen,
    setPartialOpen,
    partialDiff,
    pendingPaidRaw,
    loyaltyInfo,
    desiredLoyaltyPercent,
    handleDesiredLoyaltyPercentChange,
    loadingLoyalty,
    serviceSearch,
    handleServiceSearchChange,
    clientSearch,
    handleClientSearchChange,
    showServiceDropdown,
    setShowServiceDropdown,
    showClientDropdown,
    setShowClientDropdown,
    serviceDropdownRef,
    clientDropdownRef,
    selectedServices,
    filteredServices,
    filteredClients,
    basePrice,
    loyaltyPercent,
    loyaltyDiscountAmount,
    chargeAmount,
    toggleService,
    handleSelectClient,
    handleSubmit,
    confirmPartialPayment,
  }
}
