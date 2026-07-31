import { BadRequestException } from '@nestjs/common'

export type ManualEntryAmounts = {
  paidAmount: number
  /** Dio naplate koji pokriva cijenu servisa (bez napojnice). */
  baseAmount: number
  /** Naplaćeno iznad cijene servisa. */
  tipAmount: number
  /** Nenaplaćeni ostatak cijene servisa. */
  debtAmount: number
}

const roundToCents = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100

export const splitPaidAmount = (
  paid: number | undefined,
  servicePrice: number,
): ManualEntryAmounts => {
  const paidAmount = Number(paid ?? 0)
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw new BadRequestException('Iznos naplate nije validan.')
  }
  if (!Number.isFinite(servicePrice) || servicePrice < 0) {
    throw new BadRequestException('Cijena servisa nije validna.')
  }
  return {
    paidAmount: roundToCents(paidAmount),
    baseAmount: roundToCents(Math.min(paidAmount, servicePrice)),
    tipAmount: roundToCents(Math.max(0, paidAmount - servicePrice)),
    debtAmount: roundToCents(Math.max(0, servicePrice - paidAmount)),
  }
}
