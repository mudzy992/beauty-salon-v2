import { useTranslation } from 'react-i18next'

import {
  formatLocalizedAmount,
  formatLocalizedNumber,
  getIntlLocale,
} from '../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'
import type { DailyLogEntry } from './types'
import {
  getServiceAmount,
  getSettledDebtsSum,
  getTipAmount,
  getTotalAmount,
} from './amounts'

export const formatDailyLogDate = (
  value: string | null | undefined,
  language: string,
): string => {
  const dateOnly = value?.slice(0, 10)
  if (!dateOnly) return '—'
  try {
    return formatDateOnlyLocale(dateOnly, getIntlLocale(language), {
      dateStyle: 'medium',
    })
  } catch {
    return dateOnly
  }
}

type MobileAmountLabels = {
  services: string
  tip: string
  debts: string
}

export const formatMobileAmount = (
  entry: DailyLogEntry,
  labels: MobileAmountLabels,
  language: string,
): string => {
  const service = getServiceAmount(entry)
  const tip = getTipAmount(entry)
  const debts = getSettledDebtsSum(entry)
  const formatNumber = (value: number) =>
    formatLocalizedNumber(value, language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  const parts: string[] = [`${labels.services} ${formatNumber(service)}`]
  if (tip > 0) parts.push(`${labels.tip} ${formatNumber(tip)}`)
  if (debts > 0) parts.push(`${labels.debts} ${formatNumber(debts)}`)
  return `${parts.join(' + ')} = ${formatLocalizedAmount(getTotalAmount(entry), language)}`
}

export function LoyaltyDiscountLine({ entry }: { entry: DailyLogEntry }) {
  const { t, i18n } = useTranslation()
  const percent = entry.reservation
    ? entry.reservation.loyaltyDiscountPercent
    : Number(entry.loyaltyDiscountPercent ?? 0)
  const amount = entry.reservation
    ? Number(entry.reservation.loyaltyDiscountAmount ?? 0)
    : Number(entry.loyaltyDiscountAmount ?? 0)

  if (percent <= 0) return null

  return (
    <p className="text-xs text-emerald-600 dark:text-emerald-400">
      {t('dailyLog.table.mobile.loyaltyDiscount', {
        percent,
        amount: formatLocalizedAmount(amount, i18n.language),
      })}
    </p>
  )
}
