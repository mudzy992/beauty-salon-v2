import { BadRequestException } from '@nestjs/common';
import type { DailyLogServiceItemDto } from './dto/daily-log-service-item.dto';

export type ResolvedServiceItem = {
  serviceId: string;
  unitPrice: number;
};

/**
 * Resolve service line items with unit prices.
 * Prefer `items`; fall back to serviceIds + catalog prices map.
 */
export const resolveServiceItems = (opts: {
  items?: DailyLogServiceItemDto[];
  serviceIds?: string[];
  serviceId?: string;
  catalogPrices: Map<string, number>;
}): ResolvedServiceItem[] => {
  if (opts.items && opts.items.length > 0) {
    const seen = new Set<string>();
    const resolved: ResolvedServiceItem[] = [];
    for (const it of opts.items) {
      const sid = it.serviceId?.trim();
      if (!sid || seen.has(sid)) continue;
      seen.add(sid);
      const unitPrice = Number(it.unitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException('Cijena servisa nije validna.');
      }
      resolved.push({ serviceId: sid, unitPrice });
    }
    if (resolved.length === 0) throw new BadRequestException('SERVICE_REQUIRED');
    return resolved;
  }
  const raw =
    opts.serviceIds && opts.serviceIds.length > 0
      ? opts.serviceIds
      : opts.serviceId
        ? [opts.serviceId]
        : [];
  const ids = [...new Set(raw.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) throw new BadRequestException('SERVICE_REQUIRED');
  return ids.map((serviceId) => {
    const catalog = opts.catalogPrices.get(serviceId);
    if (catalog == null || !Number.isFinite(catalog)) {
      throw new BadRequestException('Servis nije pronađen.');
    }
    return { serviceId, unitPrice: catalog };
  });
};

export const sumUnitPrices = (items: ResolvedServiceItem[]): number =>
  items.reduce((acc, it) => acc + it.unitPrice, 0);

export const computeTipAndShortfall = (
  paid: number,
  chargeBase: number,
): { tipAmount: number; shortfall: number } => {
  const tipAmount = Math.max(0, paid - chargeBase);
  const shortfall = Math.max(0, chargeBase - paid);
  return { tipAmount, shortfall };
};

/** DEBT_PAYMENT tip vs catalog/service list price. */
export const computeDebtPaymentTip = (
  debtAmount: number,
  serviceListPrice: number,
): number => Math.max(0, debtAmount - serviceListPrice);
