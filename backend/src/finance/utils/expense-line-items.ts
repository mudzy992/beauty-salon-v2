import { BadRequestException } from '@nestjs/common';
import {
  computeLinesTotal,
  labelFromLineValues,
  type LineRoleField,
} from './expense-line-roles';

export type ModularLineItem = { values: Record<string, string> };

export type ParsedExpenseNotesV2 = {
  version: 1 | 2;
  lineItems: ModularLineItem[];
  userNotes: string;
  /** Legacy shape when version 1 — for adapter */
  legacyItems?: Array<{ name: string; qty: number; price: number }>;
};

const toNumber = (value: unknown): number => {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Parse notes: v2 `{v:2,lineItems:[{values}],userNotes}`, legacy v1, or plain text. */
export const parseExpenseNotesPayload = (
  notes: string | null | undefined,
): ParsedExpenseNotesV2 => {
  const raw = (notes ?? '').trim();
  if (!raw) return { version: 2, lineItems: [], userNotes: '' };
  if (!raw.startsWith('{')) {
    return { version: 2, lineItems: [], userNotes: raw };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const userNotes =
      typeof parsed.userNotes === 'string' ? parsed.userNotes : '';
    const version = parsed.v === 2 || parsed.version === 2 ? 2 : 1;
    const rawItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
    if (version === 2) {
      const lineItems: ModularLineItem[] = rawItems
        .filter(isRecord)
        .map((item) => {
          const valuesRaw = isRecord(item.values) ? item.values : item;
          const values: Record<string, string> = {};
          for (const [key, val] of Object.entries(valuesRaw)) {
            if (key === 'values') continue;
            values[key] = String(val ?? '');
          }
          return { values };
        });
      return { version: 2, lineItems, userNotes };
    }
    const legacyItems = rawItems.filter(isRecord).map((item) => ({
      name: String(item.name ?? ''),
      qty: toNumber(item.qty) || 1,
      price: toNumber(item.price),
    }));
    return {
      version: 1,
      lineItems: [],
      userNotes,
      legacyItems,
    };
  } catch {
    return { version: 2, lineItems: [], userNotes: raw };
  }
};

/** Map legacy name/qty/price onto template fields via lineRole. */
export const adaptLegacyLineItems = (
  fields: LineRoleField[],
  legacyItems: Array<{ name: string; qty: number; price: number }>,
): ModularLineItem[] => {
  const roleId = (role: string) =>
    fields.find((f) => (f.lineRole ?? 'NONE') === role)?.id;
  const labelId = roleId('LABEL');
  const qtyId = roleId('QTY');
  const unitId = roleId('UNIT_PRICE');
  const amountId = roleId('AMOUNT');
  return legacyItems.map((item) => {
    const values: Record<string, string> = {};
    if (labelId) values[labelId] = item.name;
    if (qtyId) values[qtyId] = String(item.qty);
    if (unitId) values[unitId] = String(item.price);
    else if (amountId) values[amountId] = String(item.qty * item.price);
    if (!labelId && !qtyId && !unitId && !amountId && fields.length >= 3) {
      values[fields[0].id] = item.name;
      values[fields[1].id] = String(item.qty);
      values[fields[2].id] = String(item.price);
    }
    return { values };
  });
};

export const resolveModularLineItems = (
  notes: string | null | undefined,
  fields: LineRoleField[],
): { lineItems: ModularLineItem[]; userNotes: string } => {
  const parsed = parseExpenseNotesPayload(notes);
  if (parsed.version === 1 && parsed.legacyItems?.length) {
    return {
      lineItems: adaptLegacyLineItems(fields, parsed.legacyItems),
      userNotes: parsed.userNotes,
    };
  }
  return { lineItems: parsed.lineItems, userNotes: parsed.userNotes };
};

export const serializeExpenseNotesV2 = (params: {
  lineItems: ModularLineItem[];
  userNotes: string;
}): string | undefined => {
  const lineItems = params.lineItems
    .map((item) => ({
      values: Object.fromEntries(
        Object.entries(item.values).map(([k, v]) => [k, String(v ?? '').trim()]),
      ),
    }))
    .filter((item) => Object.values(item.values).some((v) => v.length > 0));
  const userNotes = params.userNotes.trim();
  if (lineItems.length === 0 && !userNotes) return undefined;
  if (lineItems.length === 0) return userNotes;
  return JSON.stringify({ v: 2, lineItems, userNotes });
};

export const assertVariableLineItemsMatchTemplate = (
  fields: LineRoleField[],
  lineItems: ModularLineItem[] | undefined,
  options?: { requireAtLeastOne?: boolean },
): void => {
  const items = lineItems ?? [];
  if (options?.requireAtLeastOne !== false && items.length === 0) {
    throw new BadRequestException('Dodajte barem jednu stavku rashoda.');
  }
  const fieldIds = new Set(fields.map((f) => f.id));
  for (const [index, item] of items.entries()) {
    for (const fieldId of Object.keys(item.values)) {
      if (!fieldIds.has(fieldId)) {
        throw new BadRequestException(
          `Stavka ${index + 1}: nepoznato polje predloška.`,
        );
      }
    }
    for (const field of fields) {
      if (!field.isRequired) continue;
      const value = (item.values[field.id] ?? '').trim();
      if (!value) {
        throw new BadRequestException(
          `Stavka ${index + 1}: obavezno polje nije popunjeno.`,
        );
      }
    }
    if (!labelFromLineValues(fields, item.values)) {
      throw new BadRequestException(
        `Stavka ${index + 1}: naziv/oznaka je obavezna.`,
      );
    }
  }
};

export const expectedTotalFromLines = (
  fields: LineRoleField[],
  lineItems: ModularLineItem[],
): number => computeLinesTotal(fields, lineItems);
