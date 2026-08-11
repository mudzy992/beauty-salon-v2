import type { LegacyLineItem, LineItem, TemplateField } from '../finance.types'
import { fieldByRole } from './expense-line-roles'

export const adaptLegacyToModular = (
  fields: TemplateField[],
  legacyItems: LegacyLineItem[],
): LineItem[] => {
  const labelId = fieldByRole(fields, 'LABEL')?.id
  const qtyId = fieldByRole(fields, 'QTY')?.id
  const unitId = fieldByRole(fields, 'UNIT_PRICE')?.id
  const amountId = fieldByRole(fields, 'AMOUNT')?.id
  return legacyItems.map((item) => {
    const values: Record<string, string> = {}
    if (labelId) values[labelId] = item.name
    if (qtyId) values[qtyId] = String(item.qty)
    if (unitId) values[unitId] = String(item.price)
    else if (amountId) values[amountId] = String(item.qty * item.price)
    if (!labelId && !qtyId && !unitId && !amountId && fields.length >= 3) {
      values[fields[0].id] = item.name
      values[fields[1].id] = String(item.qty)
      values[fields[2].id] = String(item.price)
    }
    return { values }
  })
}
