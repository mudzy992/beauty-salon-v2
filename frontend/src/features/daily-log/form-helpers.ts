import type {
  DailyLogEntry,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
} from './types'

export const emptyDailyLogForm = (): DailyLogFormState => ({
  stylistProfileId: '',
  serviceIds: [],
  clientId: '',
  date: new Date().toISOString().slice(0, 10),
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
  return {
    stylistProfileId: entry.stylistProfile?.id ?? '',
    serviceIds,
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
export const computeChargeAmount = (opts: {
  serviceIds: string[]
  services: ServiceOption[]
  loyaltyInfo: LoyaltyInfo | null
  desiredLoyaltyPercent: number
}): { chargeAmount: number; loyaltyPercent: number } => {
  const selected = opts.serviceIds
    .map((id) => opts.services.find((s) => s.id === id))
    .filter(Boolean) as ServiceOption[]
  const base = selected.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
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
  const discount = base > 0 ? (base * loyaltyPercent) / 100 : 0
  return { chargeAmount: Math.max(0, base - discount), loyaltyPercent }
}

export const parsePaidAmount = (paidAmount: string, fallback: number): number => {
  if (paidAmount.trim().length === 0) return fallback
  return Number(paidAmount.replace(',', '.'))
}
