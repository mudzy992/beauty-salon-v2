/**
 * Daily log money convention:
 * - actualPrice = total collected (tip included)
 * - tipAmount = tip portion
 * - service amount (KIF `amount`) = actualPrice - tipAmount
 */
export const getServiceAmount = (actualPrice: unknown, tipAmount: unknown): number => {
  const total = Number(actualPrice ?? 0);
  const tip = Number(tipAmount ?? 0);
  if (!Number.isFinite(total) || !Number.isFinite(tip)) return 0;
  return Math.max(0, total - tip);
};
