export type OpenDebtRow = {
  id: string;
  amount: number | string;
  createdAt: string;
  service?: { name?: string | null } | null;
};

export const sumUnitPrices = (
  serviceIds: string[],
  unitPrices: Record<string, number>,
): number => serviceIds.reduce((acc, id) => acc + Number(unitPrices[id] ?? 0), 0);

export const sumSelectedDebts = (
  debts: OpenDebtRow[],
  settledDebtIds: string[],
): number => {
  const selected = new Set(settledDebtIds);
  return debts.reduce((acc, d) => (selected.has(d.id) ? acc + Number(d.amount || 0) : acc), 0);
};

export const computeCharge = (opts: {
  serviceIds: string[];
  unitPrices: Record<string, number>;
  loyaltyPercent: number;
  settleDebtsEnabled: boolean;
  settledDebtIds: string[];
  openDebts: OpenDebtRow[];
}): { servicesSum: number; loyaltyDiscount: number; debtsSum: number; chargeAmount: number } => {
  const servicesSum = sumUnitPrices(opts.serviceIds, opts.unitPrices);
  const loyaltyDiscount =
    servicesSum > 0 && opts.loyaltyPercent > 0
      ? (servicesSum * opts.loyaltyPercent) / 100
      : 0;
  const debtsSum = opts.settleDebtsEnabled
    ? sumSelectedDebts(opts.openDebts, opts.settledDebtIds)
    : 0;
  const chargeAmount = Math.max(0, servicesSum - loyaltyDiscount) + debtsSum;
  return { servicesSum, loyaltyDiscount, debtsSum, chargeAmount };
};

export const parsePaid = (raw: string, fallback: number): number => {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const n = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
