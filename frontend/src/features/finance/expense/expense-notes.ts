import type { LegacyLineItem, LineItem, TemplateField } from '../finance.types'
import { toNumber } from '../finance.utils'
import {
  createEmptyModularLine,
  labelFromLineValues,
} from './expense-line-roles'
import { adaptLegacyToModular } from './expense-line-roles-adapters'

export type ParsedExpenseNotes = {
  lineItems: LineItem[]
  userNotes: string
  version: 1 | 2
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

/** Čita notes v2, legacy v1 `{name,qty,price}`, ili plain text. */
export const parseExpenseNotes = (
  notes: string | null | undefined,
  fields: TemplateField[] = [],
): ParsedExpenseNotes => {
  const raw = (notes ?? '').trim()
  if (!raw) return { lineItems: [], userNotes: '', version: 2 }
  if (!raw.startsWith('{')) {
    return { lineItems: [], userNotes: raw, version: 2 }
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const userNotes = typeof parsed.userNotes === 'string' ? parsed.userNotes : ''
    const version = parsed.v === 2 || parsed.version === 2 ? 2 : 1
    const rawItems = Array.isArray(parsed.lineItems) ? parsed.lineItems : []
    if (version === 2) {
      const lineItems: LineItem[] = rawItems.filter(isRecord).map((item) => {
        const src = isRecord(item.values) ? item.values : item
        const values: Record<string, string> = {}
        for (const [k, v] of Object.entries(src)) {
          if (k === 'values') continue
          values[k] = String(v ?? '')
        }
        return { values }
      })
      return { lineItems, userNotes, version: 2 }
    }
    const legacy: LegacyLineItem[] = rawItems.filter(isRecord).map((item) => ({
      name: String(item.name ?? ''),
      qty: toNumber(item.qty as string | number | null | undefined) || 1,
      price: toNumber(item.price as string | number | null | undefined),
    }))
    return {
      lineItems: adaptLegacyToModular(fields, legacy),
      userNotes,
      version: 1,
    }
  } catch {
    return { lineItems: [], userNotes: raw, version: 2 }
  }
}

export const serializeExpenseNotes = (params: {
  lineItems: LineItem[]
  userNotes: string
}): string | undefined => {
  const lineItems = params.lineItems
    .map((item) => ({
      values: Object.fromEntries(
        Object.entries(item.values).map(([k, v]) => [k, String(v ?? '').trim()]),
      ),
    }))
    .filter((item) => Object.values(item.values).some((v) => v.length > 0))
  const userNotes = params.userNotes.trim()
  if (lineItems.length === 0 && !userNotes) return undefined
  if (lineItems.length === 0) return userNotes
  return JSON.stringify({ v: 2, lineItems, userNotes })
}

export const formatLineItemLabel = (
  item: LineItem,
  fields: TemplateField[] = [],
): string => labelFromLineValues(fields, item.values) || 'Stavka'

export const formatExpenseNotesSummary = (
  notes: string | null | undefined,
  fields: TemplateField[] = [],
): { userNotes: string; lineLabels: string[] } => {
  const parsed = parseExpenseNotes(notes, fields)
  return {
    userNotes: parsed.userNotes,
    lineLabels: parsed.lineItems.map((item) => formatLineItemLabel(item, fields)),
  }
}

export { createEmptyModularLine }
