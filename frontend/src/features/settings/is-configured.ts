import type { AppSetting, RegistryItem } from './types'

export function isMeaningfullyConfigured(
  row: AppSetting | undefined,
  reg: RegistryItem | undefined,
): boolean {
  if (!row || !reg) return false
  if (row.isSecret) return Boolean(row.isConfigured)
  const v = row.value
  if (v === null || v === undefined) return false
  const s = String(v).trim()
  if (reg.type === 'boolean') {
    const def = (reg.defaultValue ?? 'false').toLowerCase()
    return s.toLowerCase() !== def
  }
  if (reg.type === 'number') {
    return s !== (reg.defaultValue ?? '0')
  }
  if (reg.type === 'json') {
    const def = (reg.defaultValue ?? '').trim()
    if (s === '') return false
    return !(def !== '' && s === def)
  }
  const def = reg.defaultValue ?? ''
  if (s === '') return false
  return !(def !== '' && s === def)
}
