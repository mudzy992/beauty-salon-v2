import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type {
  ClientDebtOption,
  DailyLogEntry,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
} from './types'
import {
  buildItemsPayload,
  computeChargeAmount,
  defaultUnitPrice,
  emptyDailyLogForm,
  mapEntryToForm,
  parsePaidAmount,
} from './form-helpers'

type ToastFns = ReturnType<typeof useAppToast>

type Args = {
  loadData: () => void
  toast: ToastFns
}

export const useDailyLogForm = ({ loadData, toast }: Args) => {
  const { success, error, warning } = toast
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<DailyLogFormState>(emptyDailyLogForm)
  const [paidAmount, setPaidAmount] = useState('')
  const [paidTouched, setPaidTouched] = useState(false)
  const [createDebt, setCreateDebt] = useState(true)
  const [openDebts, setOpenDebts] = useState<ClientDebtOption[]>([])
  const [settleDebtsEnabled, setSettleDebtsEnabled] = useState(false)
  const [settledDebtIds, setSettledDebtIds] = useState<string[]>([])
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)

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

  useEffect(() => {
    if (!form.clientId) {
      setOpenDebts([])
      setSettledDebtIds([])
      setSettleDebtsEnabled(false)
      return
    }
    let isMounted = true
    api
      .get<ClientDebtOption[]>('/api/client-debts', {
        params: { clientId: form.clientId },
      })
      .then((r) => {
        if (!isMounted) return
        setOpenDebts(Array.isArray(r.data) ? r.data : [])
      })
      .catch(() => {
        if (isMounted) setOpenDebts([])
      })
    return () => {
      isMounted = false
    }
  }, [form.clientId])

  const charge = useMemo(
    () =>
      computeChargeAmount({
        serviceIds: form.serviceIds,
        unitPrices: form.unitPrices,
        loyaltyInfo,
        desiredLoyaltyPercent: form.desiredLoyaltyPercent,
        settledDebtIds: settleDebtsEnabled ? settledDebtIds : [],
        openDebts,
      }),
    [
      form.serviceIds,
      form.unitPrices,
      form.desiredLoyaltyPercent,
      loyaltyInfo,
      settleDebtsEnabled,
      settledDebtIds,
      openDebts,
    ],
  )

  useEffect(() => {
    if (!paidTouched) {
      setPaidAmount(charge.chargeAmount > 0 ? charge.chargeAmount.toFixed(2) : '')
    }
  }, [charge.chargeAmount, paidTouched])

  const paidRaw = parsePaidAmount(paidAmount, charge.chargeAmount)
  const tipPreview = Math.max(0, paidRaw - charge.chargeAmount)
  const shortfall = Math.max(0, charge.chargeAmount - paidRaw)

  useEffect(() => {
    if (shortfall > 0) setCreateDebt(true)
  }, [shortfall])

  const openCreateForm = () => {
    setEditId(null)
    setForm(emptyDailyLogForm())
    setLoyaltyInfo(null)
    setPaidAmount('')
    setPaidTouched(false)
    setCreateDebt(true)
    setOpenDebts([])
    setSettleDebtsEnabled(false)
    setSettledDebtIds([])
    setOpen(true)
  }

  const openEditForm = (entry: DailyLogEntry) => {
    setEditId(entry.id)
    setForm(mapEntryToForm(entry))
    setPaidAmount(entry.actualPrice != null ? String(Number(entry.actualPrice)) : '')
    setPaidTouched(true)
    setCreateDebt(false)
    setSettleDebtsEnabled(false)
    setSettledDebtIds([])
    setOpen(true)
  }

  const setUnitPrice = (serviceId: string, value: number) => {
    setForm((prev) => ({
      ...prev,
      unitPrices: { ...prev.unitPrices, [serviceId]: value },
    }))
  }

  const toggleService = (svc: ServiceOption) => {
    setForm((prev) => {
      const exists = prev.serviceIds.includes(svc.id)
      if (exists) {
        const nextIds = prev.serviceIds.filter((id) => id !== svc.id)
        const nextPrices = { ...prev.unitPrices }
        delete nextPrices[svc.id]
        return { ...prev, serviceIds: nextIds, unitPrices: nextPrices }
      }
      return {
        ...prev,
        serviceIds: [...prev.serviceIds, svc.id],
        unitPrices: { ...prev.unitPrices, [svc.id]: defaultUnitPrice(svc) },
      }
    })
  }

  const handlePaidAmountChange = (v: string) => {
    setPaidTouched(true)
    setPaidAmount(v)
  }

  const handleSettleDebtsEnabledChange = (v: boolean) => {
    setSettleDebtsEnabled(v)
    if (v) {
      setSettledDebtIds(openDebts.map((d) => d.id))
    } else {
      setSettledDebtIds([])
    }
  }

  const handleToggleSettledDebt = (debtId: string) => {
    setSettledDebtIds((prev) =>
      prev.includes(debtId) ? prev.filter((id) => id !== debtId) : [...prev, debtId],
    )
  }

  const handleSave = async () => {
    if (!form.stylistProfileId || form.serviceIds.length === 0) {
      warning('Odaberite stilistu i servis')
      return
    }
    if (!Number.isFinite(paidRaw) || paidRaw < 0) {
      warning('Unesite ispravan iznos naplaćenog računa')
      return
    }
    if (settleDebtsEnabled && settledDebtIds.length > 0 && paidRaw < charge.debtsSum) {
      warning('Nedovoljno za naplatu označenih dugova')
      return
    }
    if (shortfall > 0 && createDebt && !form.clientId) {
      warning('Za zavođenje duga odaberite klijenta')
      return
    }
    const tipAuto = tipPreview
    const loyalty =
      charge.loyaltyPercent > 0 ? { desiredLoyaltyPercent: charge.loyaltyPercent } : {}
    const items = buildItemsPayload(form.serviceIds, form.unitPrices)
    setSaving(true)
    try {
      if (editId) {
        await api.patch(`/api/daily-log/${editId}`, {
          actualPrice: paidRaw,
          tipAmount: tipAuto,
          notes: form.notes || undefined,
          date: form.date,
          stylistProfileId: form.stylistProfileId,
          items,
          clientId: form.clientId || null,
          status: form.status,
          ...loyalty,
        })
      } else {
        await api.post('/api/daily-log', {
          stylistProfileId: form.stylistProfileId,
          items,
          clientId: form.clientId || undefined,
          date: form.date,
          paidAmount: paidRaw,
          actualPrice: paidRaw,
          tipAmount: tipAuto,
          notes: form.notes || undefined,
          isManual: true,
          debtHandling: shortfall > 0 && createDebt ? 'CREATE_DEBT' : 'IGNORE_DEBT',
          settledDebtIds:
            settleDebtsEnabled && settledDebtIds.length > 0 ? settledDebtIds : undefined,
          ...loyalty,
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

  return {
    open,
    setOpen,
    saving,
    setSaving,
    editId,
    form,
    setForm,
    paidAmount,
    setPaidAmount: handlePaidAmountChange,
    createDebt,
    setCreateDebt,
    openDebts,
    settleDebtsEnabled,
    setSettleDebtsEnabled: handleSettleDebtsEnabledChange,
    settledDebtIds,
    onToggleSettledDebt: handleToggleSettledDebt,
    chargeAmount: charge.chargeAmount,
    debtsSum: charge.debtsSum,
    tipPreview,
    shortfall,
    basePrice: charge.servicesSum,
    loyaltyPercent: charge.loyaltyPercent,
    loyaltyDiscountAmount: charge.loyaltyDiscountAmount,
    loyaltyInfo,
    loadingLoyalty,
    openCreateForm,
    openEditForm,
    handleSave,
    toggleService,
    setUnitPrice,
  }
}
