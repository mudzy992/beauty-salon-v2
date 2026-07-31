import { BadRequestException } from '@nestjs/common';

type TemplateField = {
  id: string;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
};

type FieldValueInput = { fieldId: string; value: string };

const isBlank = (value: string | undefined): boolean =>
  value == null || value.trim().length === 0;

const assertValueMatchesType = (field: TemplateField, value: string): void => {
  if (isBlank(value)) return;
  if (field.fieldType === 'NUMBER' || field.fieldType === 'CURRENCY') {
    if (!Number.isFinite(Number(value))) {
      throw new BadRequestException(
        `Polje "${field.fieldName}" mora biti broj.`,
      );
    }
    return;
  }
  if (field.fieldType === 'DATE' && Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(
      `Polje "${field.fieldName}" mora biti validan datum.`,
    );
  }
};

/**
 * Vrijednosti moraju pripadati predlošku. Obavezna polja se forsira samo
 * za fiksne kategorije (doprinosi); fakture (materijal) koriste line-items.
 */
export const assertFieldValuesMatchTemplate = (
  fields: TemplateField[],
  values: FieldValueInput[] | undefined,
  options: { requireRequiredFields?: boolean } = {},
): void => {
  const requireRequiredFields = options.requireRequiredFields ?? true;
  const provided = values ?? [];
  const allowed = new Map(fields.map((f) => [f.id, f]));
  const seen = new Set<string>();

  for (const item of provided) {
    const field = allowed.get(item.fieldId);
    if (!field) {
      throw new BadRequestException(
        'Polje ne pripada predlošku odabrane kategorije.',
      );
    }
    if (seen.has(item.fieldId)) {
      throw new BadRequestException(
        `Polje "${field.fieldName}" je poslano više puta.`,
      );
    }
    seen.add(item.fieldId);
    assertValueMatchesType(field, item.value);
  }

  if (!requireRequiredFields) return;

  const byId = new Map(provided.map((v) => [v.fieldId, v.value]));
  const missing = fields
    .filter((f) => f.isRequired && isBlank(byId.get(f.id)))
    .map((f) => f.fieldName);
  if (missing.length > 0) {
    throw new BadRequestException(
      `Nedostaju obavezna polja: ${missing.join(', ')}.`,
    );
  }
};
