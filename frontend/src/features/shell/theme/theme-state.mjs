/**
 * NEJRA §12 — jedini izbornik teme, tri fiksna stanja.
 *
 * Namjerno bez React-a i bez čitanja `matchMedia(prefers-color-scheme)`: Q8 traži
 * tri fiksna stanja s `classic` kao defaultom, a ne sistemsku temu. Modul je čista
 * logika nad DOM-u sličnim objektom, pa se `test:theme-state` može izvršiti u
 * `node --test` bez browsera.
 *
 * SSOT: `docs/design/NEJRA – beauty salon · Referentni dokument.html` §10 i §12.
 */

/** Ključ u localStorage. NEJRA §12: `nejra.theme`. */
export const THEME_STORAGE_KEY = 'nejra.theme'

/** Tri i samo tri stanja; `classic` je default i današnji izgled. */
export const THEME_CHOICES = ['classic', 'aurum-light', 'aurum-dark']

/**
 * `skin`/`mode` su izvedeni, ne pohranjeni. `themeColor` održava
 * `<meta name="theme-color">`: za `classic` se vraća tačna početna vrijednost iz
 * `frontend/index.html` (#0f172a), a za Aurum stanja `page` boja iz NEJRA §10.
 */
export const THEME_META = {
  classic: { skin: 'classic', mode: 'light', themeColor: '#0f172a' },
  'aurum-light': { skin: 'aurum', mode: 'light', themeColor: '#FAF6EF' },
  'aurum-dark': { skin: 'aurum', mode: 'dark', themeColor: '#0E0B08' },
}

/** Nepoznata/izbrisana/oštećena spremljena vrijednost → default (NEJRA §12). */
export function normalizeTheme(value) {
  return THEME_CHOICES.includes(value) ? value : 'classic'
}

/** Čitanje localStorage; blokiran storage ne smije srušiti aplikaciju. */
export function readStoredTheme(storage) {
  try {
    return normalizeTheme(storage?.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'classic'
  }
}

/** Pisanje isključivo normalizovane vrijednosti; vraća ju radi round-trip testova. */
export function writeStoredTheme(storage, choice) {
  const value = normalizeTheme(choice)
  try {
    storage?.setItem(THEME_STORAGE_KEY, value)
  } catch {
    // Privatni režim / puni storage: izbor ostaje važeći za ovu sesiju.
  }
  return value
}

/**
 * Primjenjuje stanje na `<html>`: `data-skin`, `data-mode`, klasa `dark`
 * (SAMO za `aurum-dark`, odluka `dark_yes`), `color-scheme` i meta theme-color.
 * `<html lang>` se ne dira — i dalje prati BS/EN i18n.
 *
 * `root` je DOM-u sličan objekt (`dataset`, `classList.toggle`, `style`,
 * `ownerDocument`); `doc` se može proslijediti eksplicitno radi testova.
 */
export function applyTheme(root, choice, doc) {
  const value = normalizeTheme(choice)
  const meta = THEME_META[value]
  const documentRef = doc ?? root?.ownerDocument

  root.dataset.skin = meta.skin
  root.dataset.mode = meta.mode
  root.classList.toggle('dark', value === 'aurum-dark')

  // `classic` nema inline color-scheme: vraća se točno na početno stanje iz
  // index.html (ugovor: default = današnji izgled). `.dark` u CSS-u već nosi
  // `color-scheme: dark`; inline vrijednost ga samo eksplicitno potvrđuje.
  if (value === 'classic') {
    root.style.removeProperty?.('color-scheme')
  } else {
    root.style.colorScheme = meta.mode === 'dark' ? 'dark' : 'light'
  }

  const themeColor = documentRef?.querySelector?.('meta[name="theme-color"]')
  if (themeColor) themeColor.setAttribute('content', meta.themeColor)

  return value
}
