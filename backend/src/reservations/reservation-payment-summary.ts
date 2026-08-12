import { getServiceAmount } from '../daily-log/daily-log.amounts';

export interface ReservationPaymentSummary {
  publicReferenceCode: string;
  actualPrice: number;
  tipAmount: number;
  serviceAmount: number;
  completedAt: string;
  loyaltyDiscountAmount: number;
  items: Array<{ name: string; unitPrice: number }>;
}

type DailyLogPaymentSource = {
  publicReferenceCode: string;
  actualPrice: unknown;
  tipAmount: unknown;
  loyaltyDiscountAmount: unknown;
  completedAt: Date | null;
  items: Array<{
    unitPrice: unknown;
    service: { name: string };
  }>;
};

export const mapReservationPaymentSummary = (
  entry: DailyLogPaymentSource | null | undefined,
): ReservationPaymentSummary | null => {
  if (!entry || !entry.completedAt) return null;
  const actualPrice = Number(entry.actualPrice);
  const tipAmount = Number(entry.tipAmount);
  return {
    publicReferenceCode: entry.publicReferenceCode,
    actualPrice,
    tipAmount,
    serviceAmount: getServiceAmount(entry.actualPrice, entry.tipAmount),
    completedAt: entry.completedAt.toISOString(),
    loyaltyDiscountAmount: Number(entry.loyaltyDiscountAmount ?? 0),
    items: entry.items.map((item) => ({
      name: item.service.name,
      unitPrice: Number(item.unitPrice),
    })),
  };
};
