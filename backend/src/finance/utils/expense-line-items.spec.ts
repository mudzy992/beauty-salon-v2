import {
  adaptLegacyLineItems,
  parseExpenseNotesPayload,
  resolveModularLineItems,
  serializeExpenseNotesV2,
  assertVariableLineItemsMatchTemplate,
  expectedTotalFromLines,
} from './expense-line-items';
import { computeLineTotal } from './expense-line-roles';

const fields = [
  { id: 'l', fieldType: 'TEXT', isRequired: true, lineRole: 'LABEL' },
  { id: 'q', fieldType: 'NUMBER', isRequired: true, lineRole: 'QTY' },
  { id: 'p', fieldType: 'CURRENCY', isRequired: true, lineRole: 'UNIT_PRICE' },
];

describe('expense-line-items', () => {
  it('parses legacy v1 notes', () => {
    const raw = JSON.stringify({
      lineItems: [{ name: 'Lak', qty: 2, price: 10 }],
      userNotes: 'napomena',
    });
    const parsed = parseExpenseNotesPayload(raw);
    expect(parsed.version).toBe(1);
    expect(parsed.legacyItems?.[0]).toEqual({ name: 'Lak', qty: 2, price: 10 });
  });

  it('adapts legacy to modular via lineRole', () => {
    const items = adaptLegacyLineItems(fields, [
      { name: 'Lak', qty: 2, price: 10 },
    ]);
    expect(items[0].values).toEqual({ l: 'Lak', q: '2', p: '10' });
  });

  it('serializes and resolves v2', () => {
    const notes = serializeExpenseNotesV2({
      lineItems: [{ values: { l: 'Lak', q: '2', p: '10' } }],
      userNotes: '',
    });
    expect(notes).toContain('"v":2');
    const resolved = resolveModularLineItems(notes, fields);
    expect(resolved.lineItems[0].values.l).toBe('Lak');
    expect(expectedTotalFromLines(fields, resolved.lineItems)).toBe(20);
  });

  it('computes line total from QTY × UNIT_PRICE', () => {
    expect(computeLineTotal(fields, { l: 'X', q: '3', p: '4.5' })).toBe(13.5);
  });

  it('rejects missing required line values', () => {
    expect(() =>
      assertVariableLineItemsMatchTemplate(fields, [
        { values: { l: 'X', q: '', p: '1' } },
      ]),
    ).toThrow();
  });
});
