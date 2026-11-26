/** Policy for the single Aurum identity and its light/dark modes. */
export const MODE_STORAGE_KEY = 'nejra.theme.mode'
export const LEGACY_STORAGE_KEY = 'nejra.theme'

export function resolveTheme(defaultMode, preference) {
  const mode = preference === 'light' || preference === 'dark'
    ? preference
    : defaultMode === 'dark' ? 'dark' : 'light'
  return `aurum-${mode}`
}

/** Read only supported light/dark preferences; unsupported values are ignored. */
export function readModePreference(storage) {
  try {
    const stored = storage?.getItem(MODE_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    if (stored !== null && stored !== undefined) return null
    const legacy = storage?.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'aurum-light') return 'light'
    if (legacy === 'aurum-dark') return 'dark'
  } catch {
    // Keep the configured default when storage is unavailable.
  }
  return null
}

export function writeModePreference(storage, mode) {
  if (mode !== 'light' && mode !== 'dark') return false
  try {
    storage?.setItem(MODE_STORAGE_KEY, mode)
    return Boolean(storage)
  } catch {
    return false
  }
}
