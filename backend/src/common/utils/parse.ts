export const parseFiniteNumber = (
  value: string | null | undefined,
  fallback: number,
): number => {
  if (value == null) return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export const parseBooleanString = (
  value: string | null | undefined,
  fallback: boolean,
): boolean => {
  if (value == null) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return fallback
}
