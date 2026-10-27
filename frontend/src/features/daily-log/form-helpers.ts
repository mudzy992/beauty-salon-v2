import type {
  ClientDebtOption,
  DailyLogEntry,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
} from './types'
import { getSalonDateOnly } from '../../../../shared/business-date.mjs'

export const emptyDailyLogForm = (): DailyLogFormState => ({
  stylistProfileId: '',
  serviceIds: [],
  unitPrices: {},
  clientId: '',
  date: getSalonDateOnly(),
  actualPrice: 0,
  tipAmount: 0,
  notes: '',
  isManual: true,
  desiredLoyaltyPercent: 0,
  status: 'PENDING',
})

export const mapEntryToForm = (entry: DailyLogEntry): DailyLogFormState => {
  const serviceIds =
    Array.isArray(entry.items) && entry.items.length > 0
      ? entry.items.map((x) => x.serviceId)
      : entry.service?.id
        ? [entry.service.id]
        : []
  const unitPrices: Record<string, number> = {}
  for (const it of entry.items ?? []) {
    unitPrices[it.serviceId] = Number(
      it.unitPrice ?? it.service?.price ?? 0,
    )
  }
  return {
    stylistProfileId: entry.stylistProfile?.id ?? '',
    serviceIds,
    unitPrices,
    clientId: entry.client?.id ?? '',
    date: entry.date?.slice(0, 10) ?? '',
    actualPrice: Number(entry.actualPrice),
    tipAmount: Number(entry.tipAmount),
    notes: entry.notes ?? '',
    isManual: entry.isManual,
    desiredLoyaltyPercent: Number(entry.loyaltyDiscountPercent ?? 0),
    status: entry.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
  }
}

export const sumUnitPrices = (
  serviceIds: string[],
  unitPrices: Record<string, number>,
): number =>
  serviceIds.reduce((acc, id) => acc + Number(unitPrices[id] ?? 0), 0)

export const computeChargeAmount = (opts: {
  serviceIds: string[]
  unitPrices: Record<string, number>
  loyaltyInfo: LoyaltyInfo | null
  desiredLoyaltyPercent: number
  settledDebtIds: string[]
  openDebts: ClientDebtOption[]
}): {
  servicesSum: number
  debtsSum: number
  chargeAmount: number
  loyaltyPercent: number
  loyaltyDiscountAmount: number
} => {
  const servicesSum = sumUnitPrices(opts.serviceIds, opts.unitPrices)
  const loyaltyPercent =
    opts.loyaltyInfo?.enabled &&
    opts.loyaltyInfo?.hasAccount &&
    opts.loyaltyInfo?.redeemEnabled &&
    opts.loyaltyInfo?.service
      ? Math.max(
          0,
          Math.min(opts.desiredLoyaltyPercent, opts.loyaltyInfo.service.maxDiscountPercent),
        )
      : 0
  const loyaltyDiscountAmount = servicesSum > 0 ? (servicesSum * loyaltyPercent) / 100 : 0
  const servicesCharge = Math.max(0, servicesSum - loyaltyDiscountAmount)
  const debtsSum = opts.openDebts
    .filter((d) => opts.settledDebtIds.includes(d.id))
    .reduce((acc, d) => acc + Number(d.amount), 0)
  return {
    servicesSum,
    debtsSum,
    chargeAmount: servicesCharge + debtsSum,
    loyaltyPercent,
    loyaltyDiscountAmount,
  }
}

export const parsePaidAmount = (paidAmount: string, fallback: number): number => {
  if (paidAmount.trim().length === 0) return fallback
  return Number(paidAmount.replace(',', '.'))
}

export const buildItemsPayload = (
  serviceIds: string[],
  unitPrices: Record<string, number>,
): Array<{ serviceId: string; unitPrice: number }> =>
  serviceIds.map((serviceId) => ({
    serviceId,
    unitPrice: Number(unitPrices[serviceId] ?? 0),
  }))

export const defaultUnitPrice = (svc: ServiceOption): number => Number(svc.price ?? 0)
