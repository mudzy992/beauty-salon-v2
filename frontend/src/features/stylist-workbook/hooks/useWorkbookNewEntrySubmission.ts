import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppToast } from '../../../lib/toast/useAppToast'
import { createDailyLogEntry } from '../api/stylist-workbook.api'
import type { ClientOption } from '../types'
import { formatKm } from '../workbook-amount'
/** Rezultat slanja — stranica odlučuje o `onClose`/navigaciji. */
export type NewEntrySubmitResult = { created: false } | { created: true; entryId: string }

/** Validacija, djelimično plaćanje, payload i slanje novog unosa. */
export const useWorkbookNewEntrySubmission = ({
  profileId,
  clientId,
  selectedClient,
  serviceIds,
  date,
  paidAmount,
  notes,
  chargeAmount,
  loyaltyPercent,
}: {
  profileId: string | null
  clientId: string
  selectedClient: ClientOption | null
  serviceIds: string[]
  date: string
  paidAmount: string
  notes: string
  chargeAmount: number
  loyaltyPercent: number
}) => {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { warning, success, toastApiError } = useAppToast()
  const [saving, setSaving] = useState(false)
  const [partialOpen, setPartialOpen] = useState(false)
  const [partialDiff, setPartialDiff] = useState(0)
  const [pendingPaidRaw, setPendingPaidRaw] = useState<number | null>(null)

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
   * Djelimično plaćenje: `debtHandling` određuje da li se dug zanemaruje ili
   * bilježi; poruka uspjeha ostaje različita po putanji.
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
    saving,
    partialOpen,
    setPartialOpen,
    partialDiff,
    pendingPaidRaw,
    handleSubmit,
    confirmPartialPayment,
  }
}
