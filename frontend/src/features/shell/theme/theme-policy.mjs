/** Policy for an administrator-selected skin and a device-local Aurum mode. */
export const MODE_STORAGE_KEY = 'nejra.theme.mode'
export const LEGACY_STORAGE_KEY = 'nejra.theme'

export function resolveTheme(skin, defaultMode, preference) {
  const activeSkin = skin === 'classic' ? 'classic' : 'aurum'
  const adminMode = defaultMode === 'dark' ? 'dark' : 'light'
  const mode = preference === 'light' || preference === 'dark' ? preference : adminMode
  return activeSkin === 'classic' ? 'classic' : `aurum-${mode}`
}

/** A legacy skin must never become an administrator choice. */
export function readModePreference(storage) {
  try {
    const stored = storage?.getItem(MODE_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
    // An invalid new key does not resurrect an older choice.
    if (stored !== null && stored !== undefined) return null
    const legacy = storage?.getItem(LEGACY_STORAGE_KEY)
    if (legacy === 'aurum-light') return 'light'
    if (legacy === 'aurum-dark') return 'dark'
  } catch {
    // The administrator's default remains usable when storage is unavailable.
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
