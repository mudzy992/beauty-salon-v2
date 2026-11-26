/**
 * NEJRA §12 — Aurum has exactly two user-visible modes: light and dark.
 * Unsupported or unknown stored choices resolve safely to Aurum light.
 */
export const THEME_STORAGE_KEY = 'nejra.theme'
export const THEME_CHOICES = ['aurum-light', 'aurum-dark']

export const THEME_META = {
  'aurum-light': { skin: 'aurum', mode: 'light', themeColor: '#FAF6EF' },
  'aurum-dark': { skin: 'aurum', mode: 'dark', themeColor: '#0E0B08' },
}

export function normalizeTheme(value) {
  return THEME_CHOICES.includes(value) ? value : 'aurum-light'
}

export function readStoredTheme(storage) {
  try {
    return normalizeTheme(storage?.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'aurum-light'
  }
}

export function writeStoredTheme(storage, choice) {
  const value = normalizeTheme(choice)
  try {
    storage?.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Storage may be blocked; the selection remains valid for this session.
  }
  return value
}

export function applyTheme(root, choice, doc) {
  const value = normalizeTheme(choice)
  const meta = THEME_META[value]
  const documentRef = doc ?? root?.ownerDocument

  root.dataset.skin = 'aurum'
  root.dataset.mode = meta.mode
  root.classList.toggle('dark', value === 'aurum-dark')
  root.style.colorScheme = meta.mode

  const themeColor = documentRef?.querySelector?.('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', meta.themeColor)

  return value
}
