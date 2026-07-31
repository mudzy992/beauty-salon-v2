import { BadRequestException } from '@nestjs/common'
import { assertFieldValuesMatchTemplate } from './expense-field-values'

const fields = [
  { id: 'f1', fieldName: 'Broj fakture', fieldType: 'TEXT', isRequired: true },
  { id: 'f2', fieldName: 'Iznos', fieldType: 'NUMBER', isRequired: false },
  { id: 'f3', fieldName: 'Datum', fieldType: 'DATE', isRequired: false },
]

describe('assertFieldValuesMatchTemplate', () => {
  it('prolazi kada su sva obavezna polja popunjena', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [{ fieldId: 'f1', value: 'F-1' }]),
    ).not.toThrow()
  })

  it('baca kada obavezno polje nedostaje', () => {
    expect(() => assertFieldValuesMatchTemplate(fields, [])).toThrow(
      /Broj fakture/,
    )
  })

  it('baca kada je obavezno polje prazan string', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [{ fieldId: 'f1', value: '  ' }]),
    ).toThrow(BadRequestException)
  })

  it('baca za nepoznat fieldId', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [
        { fieldId: 'f1', value: 'F-1' },
        { fieldId: 'strano', value: 'x' },
      ]),
    ).toThrow(/ne pripada predlošku/)
  })

  it('baca za duplirano polje', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [
        { fieldId: 'f1', value: 'F-1' },
        { fieldId: 'f1', value: 'F-2' },
      ]),
    ).toThrow(/više puta/)
  })

  it('baca za nevalidan broj', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [
        { fieldId: 'f1', value: 'F-1' },
        { fieldId: 'f2', value: 'abc' },
      ]),
    ).toThrow(/mora biti broj/)
  })

  it('baca za nevalidan datum', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [
        { fieldId: 'f1', value: 'F-1' },
        { fieldId: 'f3', value: 'ne-datum' },
      ]),
    ).toThrow(/validan datum/)
  })

  it('dozvoljava prazno opcionalno polje', () => {
    expect(() =>
      assertFieldValuesMatchTemplate(fields, [
        { fieldId: 'f1', value: 'F-1' },
        { fieldId: 'f2', value: '' },
      ]),
    ).not.toThrow()
  })
})
