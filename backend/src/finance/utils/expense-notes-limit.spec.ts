import { validate } from 'class-validator';
import { CreateExpenseDto } from '../dto/create-expense.dto';
import { UpdateExpenseDto } from '../dto/update-expense.dto';
import { MAX_EXPENSE_NOTES_PAYLOAD_LENGTH } from '../expense-constants';
import { assertExpenseNotesLength, assertExpensePayload } from './expense-payload';

const lineFieldIds = {
  label: '550e8400-e29b-41d4-a716-446655440002',
  quantity: '550e8400-e29b-41d4-a716-446655440003',
  price: '550e8400-e29b-41d4-a716-446655440004',
};

const variableCategory = {
  isFixed: false,
  template: {
    fields: [
      {
        id: lineFieldIds.label,
        fieldName: 'Naziv',
        fieldType: 'TEXT',
        isRequired: true,
        lineRole: 'LABEL',
      },
      {
        id: lineFieldIds.quantity,
        fieldName: 'Količina',
        fieldType: 'NUMBER',
        isRequired: true,
        lineRole: 'QTY',
      },
      {
        id: lineFieldIds.price,
        fieldName: 'Cijena',
        fieldType: 'CURRENCY',
        isRequired: true,
        lineRole: 'UNIT_PRICE',
      },
    ],
  },
};

const longInvoiceNotes = JSON.stringify({
  v: 2,
  lineItems: Array.from({ length: 40 }, (_, index) => ({
    values: {
      [lineFieldIds.label]: `Materijal ${index + 1} ${'opis '.repeat(8)}`,
      [lineFieldIds.quantity]: '2',
      [lineFieldIds.price]: '12.50',
    },
  })),
  userNotes: 'Kratka napomena',
});

describe('expense notes size and user-note limits', () => {
  it('accepts serialized variable-category invoice lines above the old 2,000-character limit on create', async () => {
    expect(longInvoiceNotes.length).toBeGreaterThan(2000);
    const dto = Object.assign(new CreateExpenseDto(), {
      bookId: '550e8400-e29b-41d4-a716-446655440000',
      categoryId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Materijal',
      totalAmount: 1000,
      notes: longInvoiceNotes,
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(() => assertExpensePayload(variableCategory, undefined, longInvoiceNotes, 1000)).not.toThrow();
    expect(() => assertExpenseNotesLength(longInvoiceNotes, false)).not.toThrow();
  });

  it('accepts serialized variable-category invoice lines above the old limit on update', async () => {
    const dto = Object.assign(new UpdateExpenseDto(), { notes: longInvoiceNotes });
    await expect(validate(dto)).resolves.toEqual([]);
    expect(() => assertExpensePayload(variableCategory, undefined, longInvoiceNotes, 1000)).not.toThrow();
  });

  it('keeps an upper bound on serialized expense payload size', async () => {
    const dto = Object.assign(new UpdateExpenseDto(), {
      notes: 'x'.repeat(MAX_EXPENSE_NOTES_PAYLOAD_LENGTH + 1),
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'notes')).toBe(true);
  });

  it('keeps the 2,000-character limit on human-entered notes', () => {
    expect(() => assertExpenseNotesLength('a'.repeat(2000), true)).not.toThrow();
    expect(() => assertExpenseNotesLength('a'.repeat(2001), true)).toThrow(
      'Napomena može sadržavati najviše 2000 znakova.',
    );
    expect(() =>
      assertExpenseNotesLength(
        JSON.stringify({ v: 2, lineItems: [], userNotes: 'a'.repeat(2001) }),
        false,
      ),
    ).toThrow('Napomena može sadržavati najviše 2000 znakova.');
  });
});
