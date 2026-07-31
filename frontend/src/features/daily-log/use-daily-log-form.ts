import { useEffect, useState } from 'react'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { DailyLogEntry, DailyLogFormState, LoyaltyInfo, ServiceOption } from './types'
import {
  computeChargeAmount,
  emptyDailyLogForm,
  mapEntryToForm,
  parsePaidAmount,
} from './form-helpers'

type ToastFns = ReturnType<typeof useAppToast>

type Args = {
  services: ServiceOption[]
  loadData: () => void
  toast: ToastFns
}

export const useDailyLogForm = ({ services, loadData, toast }: Args) => {
  const { success, error, warning } = toast
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<DailyLogFormState>(emptyDailyLogForm)
  const [paidAmount, setPaidAmount] = useState('')
  const [partialOpen, setPartialOpen] = useState(false)
  const [partialDiff, setPartialDiff] = useState(0)
  const [pendingPaidRaw, setPendingPaidRaw] = useState<number | null>(null)
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

  const openCreateForm = () => {
    setEditId(null)
    setForm(emptyDailyLogForm())
    setLoyaltyInfo(null)
    setPaidAmount('')
    setOpen(true)
  }

  const openEditForm = (entry: DailyLogEntry) => {
    setEditId(entry.id)
    setForm(mapEntryToForm(entry))
    setPaidAmount(entry.actualPrice != null ? String(Number(entry.actualPrice)) : '')
    setOpen(true)
  }

  const chargeOpts = () =>
    computeChargeAmount({
      serviceIds: form.serviceIds,
      services,
      loyaltyInfo,
      desiredLoyaltyPercent: form.desiredLoyaltyPercent,
    })

  const handleSave = async () => {
    if (!form.stylistProfileId || form.serviceIds.length === 0) {
      warning('Odaberite stilistu i servis')
      return
    }
    const { chargeAmount, loyaltyPercent } = chargeOpts()
    const paidRaw = parsePaidAmount(paidAmount, chargeAmount)
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
    const loyalty = loyaltyPercent > 0 ? { desiredLoyaltyPercent: loyaltyPercent } : {}
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
          ...loyalty,
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

  const confirmPartial = async (debtHandling: 'CREATE_DEBT' | 'IGNORE_DEBT') => {
    if (pendingPaidRaw == null) return
    const { loyaltyPercent } = chargeOpts()
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

  return {
    open,
    setOpen,
    saving,
    setSaving,
    editId,
    form,
    setForm,
    paidAmount,
    setPaidAmount,
    partialOpen,
    setPartialOpen,
    partialDiff,
    loyaltyInfo,
    loadingLoyalty,
    openCreateForm,
    openEditForm,
    handleSave,
    confirmPartial,
  }
}
