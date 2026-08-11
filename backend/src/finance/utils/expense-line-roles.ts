export const EXPENSE_LINE_ROLES = [
  'LABEL',
  'QTY',
  'UNIT_PRICE',
  'AMOUNT',
  'NONE',
] as const;

export type ExpenseLineRole = (typeof EXPENSE_LINE_ROLES)[number];

export type LineRoleField = {
  id: string;
  fieldType: string;
  isRequired: boolean;
  lineRole?: string | null;
};

const toNumber = (value: string | undefined): number => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const normalizeLineRole = (role: string | null | undefined): ExpenseLineRole => {
  if (role && (EXPENSE_LINE_ROLES as readonly string[]).includes(role)) {
    return role as ExpenseLineRole;
  }
  return 'NONE';
};

/** Total jednog reda po lineRole pravilima. */
export const computeLineTotal = (
  fields: LineRoleField[],
  values: Record<string, string>,
): number => {
  const byRole = (role: ExpenseLineRole) =>
    fields.find((f) => normalizeLineRole(f.lineRole) === role);
  const qtyField = byRole('QTY');
  const unitField = byRole('UNIT_PRICE');
  const amountField = byRole('AMOUNT');
  if (qtyField && unitField) {
    return toNumber(values[qtyField.id]) * toNumber(values[unitField.id]);
  }
  if (amountField) return toNumber(values[amountField.id]);
  return fields
    .filter((f) => f.fieldType === 'CURRENCY')
    .reduce((sum, f) => sum + toNumber(values[f.id]), 0);
};

export const computeLinesTotal = (
  fields: LineRoleField[],
  lines: Array<{ values: Record<string, string> }>,
): number => lines.reduce((sum, line) => sum + computeLineTotal(fields, line.values), 0);

export const labelFromLineValues = (
  fields: LineRoleField[],
  values: Record<string, string>,
): string => {
  const labelField = fields.find((f) => normalizeLineRole(f.lineRole) === 'LABEL');
  if (labelField) return (values[labelField.id] ?? '').trim();
  const firstText = fields.find((f) => f.fieldType === 'TEXT');
  if (firstText) return (values[firstText.id] ?? '').trim();
  return Object.values(values).find((v) => v.trim())?.trim() ?? '';
};
