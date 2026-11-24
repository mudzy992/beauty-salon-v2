import { parseDateOnly } from '../../../../shared/business-date.mjs'
import type { Holiday } from './salon-types'

/** Reject incomplete data before it can be displayed or sent back by the editor. */
export function isHolidayList(value: unknown): value is Holiday[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object') return false
    const h = item as Record<string, unknown>
    if (typeof h.id !== 'string' || !h.id.trim() || ids.has(h.id) ||
        typeof h.name !== 'string' || typeof h.date !== 'string' ||
        typeof h.sendPush !== 'boolean' ||
        (h.message !== null && typeof h.message !== 'string') ||
        (h.pushSentAt !== null && typeof h.pushSentAt !== 'string')) return false
    try { parseDateOnly(h.date.slice(0, 10)) } catch { return false }
    ids.add(h.id)
  }
  return true
}
