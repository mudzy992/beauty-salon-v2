import type { DailyLogEntry } from './types'
import {
  getServiceAmount,
  getSettledDebtsSum,
  getTipAmount,
  getTotalAmount,
} from './amounts'

export const formatMobileAmount = (e: DailyLogEntry): string => {
  const service = getServiceAmount(e)
  const tip = getTipAmount(e)
  const debts = getSettledDebtsSum(e)
  const total = getTotalAmount(e)
  const parts: string[] = [`servisi ${service.toFixed(2)}`]
  if (tip > 0) parts.push(`nap. ${tip.toFixed(2)}`)
  if (debts > 0) parts.push(`dugovi ${debts.toFixed(2)}`)
  return `${parts.join(' + ')} = ${total.toFixed(2)} KM`
}

export const loyaltyLine = (e: DailyLogEntry) => {
  if (e.reservation && e.reservation.loyaltyDiscountPercent > 0) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400">
        Loyalty popust: {e.reservation.loyaltyDiscountPercent}% (
        {Number(e.reservation.loyaltyDiscountAmount ?? 0).toFixed(2)} KM)
      </p>
    )
  }
  if (!e.reservation && Number(e.loyaltyDiscountPercent ?? 0) > 0) {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400">
        Loyalty popust: {Number(e.loyaltyDiscountPercent)}% (
        {Number(e.loyaltyDiscountAmount ?? 0).toFixed(2)} KM)
      </p>
    )
  }
  return null
}
