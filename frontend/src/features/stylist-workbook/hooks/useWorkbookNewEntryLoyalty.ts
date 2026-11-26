import { useEffect, useState } from 'react'

import { fetchLoyaltyInfoForClient } from '../api/stylist-workbook.api'
import type { LoyaltyInfo } from '../types'

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(v)))

/**
 * Stanje lojalnosti za formu novog unosa (S10).
 *
 * Izdvojeno iz `useWorkbookNewEntryForm.ts` **bez promjene**: isti uslov
 * učitavanja (klijent + barem jedna usluga), isti reset na promjenu odabira
 * usluge/klijenta, i isti obračun popusta (zaokružen na dozvoljeni maksimum).
 */
export const useWorkbookNewEntryLoyalty = ({
  clientId,
  serviceIds,
}: {
  clientId: string
  serviceIds: string[]
}) => {
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState(0)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)

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

  const loyaltyPercent =
    loyaltyInfo?.enabled && loyaltyInfo?.hasAccount && loyaltyInfo?.redeemEnabled && loyaltyInfo?.service
      ? Math.max(0, Math.min(desiredLoyaltyPercent, loyaltyInfo.service.maxDiscountPercent))
      : 0

  /** Zadržava odabrani popust unutar dozvoljenog maksimuma. */
  const handleDesiredLoyaltyPercentChange = (value: number) => {
    const next = clampInt(
      Number(value) || 0,
      0,
      loyaltyInfo?.service?.maxDiscountPercent ?? 0,
    )
    setDesiredLoyaltyPercent(next)
  }

  /** Reset popusta (poziva se pri promjeni klijenta ili usluga). */
  const resetLoyaltyPercent = () => setDesiredLoyaltyPercent(0)

  return {
    loyaltyInfo,
    desiredLoyaltyPercent,
    handleDesiredLoyaltyPercentChange,
    resetLoyaltyPercent,
    loadingLoyalty,
    loyaltyPercent,
  }
}
