import { BadRequestException } from '@nestjs/common';
import type { CreateExpenseDto } from '../dto/create-expense.dto';
import { assertFieldValuesMatchTemplate } from './expense-field-values';
import {
  assertVariableLineItemsMatchTemplate,
  expectedTotalFromLines,
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

export function assertExpensePayload(
  category: ExpenseCategoryPayload,
  fieldValues: CreateExpenseDto['fieldValues'] | undefined,
  notes: string | null | undefined,
  totalAmount: number,
  options?: { skipFieldValues?: boolean },
) {
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
