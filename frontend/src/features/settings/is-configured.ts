import type { AppSetting, RegistryItem } from './types'

/** True when an explicit saved value differs from the value the application actually uses by default. */
export function isMeaningfullyConfigured(
  row: AppSetting | undefined,
  reg: RegistryItem | undefined,
): boolean {
  if (!row || !reg) return false
  if (row.isSecret || reg.isSecret) return Boolean(row.isConfigured)
  return String(row.value ?? '') !== String(reg.defaultValue ?? '')
}

/** Resolve the value visible to an administrator, including registry defaults for unsaved settings. */
export function getEffectiveSettingValue(
  row: AppSetting | undefined,
  reg: RegistryItem | undefined,
): string {
  if (row?.isSecret || reg?.isSecret) return ''
  return row?.value ?? reg?.defaultValue ?? ''
}
