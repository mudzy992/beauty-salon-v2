import { BadRequestException } from '@nestjs/common';
import type { CreateExpenseDto } from '../dto/create-expense.dto';
import { MAX_EXPENSE_USER_NOTES_LENGTH } from '../expense-constants';
import { assertFieldValuesMatchTemplate } from './expense-field-values';
import {
  assertVariableLineItemsMatchTemplate,
  expectedTotalFromLines,
  parseExpenseNotesPayload,
  resolveModularLineItems,
} from './expense-line-items';

type ExpenseCategoryPayload = {
  isFixed: boolean;
  template: {
    fields: Array<{
      id: string;
      fieldName: string;
      fieldType: string;
      isRequired: boolean;
      lineRole: string;
    }>;
  };
};

export function assertExpenseNotesLength(
  notes: string | null | undefined,
  isFixedCategory: boolean,
) {
  const userNotes = isFixedCategory
    ? (notes ?? '')
    : parseExpenseNotesPayload(notes).userNotes;
  if (userNotes.length > MAX_EXPENSE_USER_NOTES_LENGTH) {
    throw new BadRequestException(
      `Napomena može sadržavati najviše ${MAX_EXPENSE_USER_NOTES_LENGTH} znakova.`,
    );
  }
}

export function assertExpensePayload(
  category: ExpenseCategoryPayload,
  fieldValues: CreateExpenseDto['fieldValues'] | undefined,
  notes: string | null | undefined,
  totalAmount: number,
  options?: { skipFieldValues?: boolean },
) {
  assertExpenseNotesLength(notes, category.isFixed);
  if (category.isFixed) {
    if (options?.skipFieldValues) return;
    assertFieldValuesMatchTemplate(
      category.template.fields.map((f) => ({
        id: f.id,
        fieldName: f.fieldName,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
      })),
      fieldValues,
      { requireRequiredFields: true },
    );
    return;
  }
  const fields = category.template.fields;
  if (fields.length === 0) return;
  const { lineItems } = resolveModularLineItems(notes, fields);
  assertVariableLineItemsMatchTemplate(fields, lineItems);
  const expected = expectedTotalFromLines(fields, lineItems);
  if (Math.abs(expected - Number(totalAmount)) > 0.02) {
    throw new BadRequestException(
      `Ukupan iznos (${totalAmount}) ne odgovara zbiru stavki (${expected}).`,
    );
  }
}
