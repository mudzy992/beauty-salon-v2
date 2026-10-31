const modes = new Set(['actual_overrun', 'manual_minutes', 'use_break_only'])
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isNonNegativeFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function normalizeItem(value) {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.clientId) ||
    typeof value.serviceName !== 'string' ||
    typeof value.clientName !== 'string' ||
    typeof value.oldStartTime !== 'string' ||
    !timePattern.test(value.oldStartTime) ||
    typeof value.oldEndTime !== 'string' ||
    !timePattern.test(value.oldEndTime) ||
    typeof value.newStartTime !== 'string' ||
    !timePattern.test(value.newStartTime) ||
    typeof value.newEndTime !== 'string' ||
    !timePattern.test(value.newEndTime) ||
    !isNonNegativeFiniteNumber(value.shiftMinutes) ||
    (value.reducedBreakMinutes !== undefined && !isNonNegativeFiniteNumber(value.reducedBreakMinutes))
  ) return null

  return {
    id: value.id,
    clientId: value.clientId,
    serviceName: value.serviceName,
    clientName: value.clientName,
    oldStartTime: value.oldStartTime,
    oldEndTime: value.oldEndTime,
    newStartTime: value.newStartTime,
    newEndTime: value.newEndTime,
    shiftMinutes: value.shiftMinutes,
    ...(value.reducedBreakMinutes === undefined ? {} : { reducedBreakMinutes: value.reducedBreakMinutes }),
  }
}

export function normalizeRescheduleProposal(value) {
  if (
    !isRecord(value) ||
    (value.mode !== undefined && !modes.has(value.mode)) ||
    !isNonNegativeFiniteNumber(value.delayMinutes) ||
    !isNonNegativeFiniteNumber(value.shiftMinutes) ||
    !Array.isArray(value.items) ||
    (value.overrunMinutes !== undefined && !isNonNegativeFiniteNumber(value.overrunMinutes)) ||
    (value.includeBreaks !== undefined && typeof value.includeBreaks !== 'boolean')
  ) return null

  const items = value.items.map(normalizeItem)
  if (items.some((item) => item === null)) return null

  return {
    ...(value.mode === undefined ? {} : { mode: value.mode }),
    ...(value.overrunMinutes === undefined ? {} : { overrunMinutes: value.overrunMinutes }),
    delayMinutes: value.delayMinutes,
    shiftMinutes: value.shiftMinutes,
    ...(value.includeBreaks === undefined ? {} : { includeBreaks: value.includeBreaks }),
    items,
  }
}
