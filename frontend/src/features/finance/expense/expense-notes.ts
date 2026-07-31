import type { LineItem } from '../finance.types'
import { toNumber } from '../finance.utils'

export type ParsedExpenseNotes = {
  lineItems: LineItem[]
  userNotes: string
}

const isLineItem = (value: unknown): value is LineItem => {
  if (!value || typeof value !== 'object') return false
  const item = value as Record<string, unknown>
  return typeof item.name === 'string'
}

/** Čita legacy JSON `{ lineItems, userNotes }` ili običan tekst. */
export const parseExpenseNotes = (notes: string | null | undefined): ParsedExpenseNotes => {
  const raw = (notes ?? '').trim()
  if (!raw) return { lineItems: [], userNotes: '' }
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as {
        lineItems?: unknown
        userNotes?: unknown
      }
      const lineItems = Array.isArray(parsed.lineItems)
        ? parsed.lineItems.filter(isLineItem).map((item) => ({
            name: String(item.name),
            qty: toNumber(item.qty) || 1,
            price: toNumber(item.price),
          }))
        : []
      const userNotes =
        typeof parsed.userNotes === 'string' ? parsed.userNotes : ''
      return { lineItems, userNotes }
    } catch {
      return { lineItems: [], userNotes: raw }
    }
  }
  return { lineItems: [], userNotes: raw }
}

/** Sprema strukturu kompatibilnu sa postojećim Materijal zapisima. */
export const serializeExpenseNotes = (params: {
  lineItems: LineItem[]
  userNotes: string
}): string | undefined => {
  const lineItems = params.lineItems
    .filter((item) => item.name.trim())
    .map((item) => ({
      name: item.name.trim(),
      qty: toNumber(item.qty) || 1,
      price: toNumber(item.price),
    }))
  const userNotes = params.userNotes.trim()
  if (lineItems.length === 0 && !userNotes) return undefined
  if (lineItems.length === 0) return userNotes
  return JSON.stringify({ lineItems, userNotes })
}

export const formatLineItemLabel = (item: LineItem): string =>
  `${item.name} × ${toNumber(item.qty)} @ ${toNumber(item.price).toFixed(2)}`

export const formatExpenseNotesSummary = (
  notes: string | null | undefined,
): { userNotes: string; lineLabels: string[] } => {
  const parsed = parseExpenseNotes(notes)
  return {
    userNotes: parsed.userNotes,
    lineLabels: parsed.lineItems.map(formatLineItemLabel),
  }
}
