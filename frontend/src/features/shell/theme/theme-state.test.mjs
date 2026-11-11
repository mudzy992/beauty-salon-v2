/**
 * `test:theme-state` — NEJRA §12: tri fiksna stanja, default `classic`, tačni
 * atributi na `<html>`, localStorage round-trip. Bez browsera: čista logika +
 * mutacijske provjere nad izvorom (isti stil kao `test:design-spec`).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  THEME_STORAGE_KEY,
  THEME_CHOICES,
  THEME_META,
  normalizeTheme,
  readStoredTheme,
  writeStoredTheme,
  applyTheme,
} from './theme-state.mjs'

const source = readFileSync(new URL('./theme-state.mjs', import.meta.url), 'utf8')

/** Komentari se ne smiju brojati kao kod (isti pristup kao `wcag-source-contracts`). */
function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1) => p1)
}
const code = blankComments(source)

/** Minimalni DOM-u sličan objekt: dovoljan `applyTheme`, bez jsdom-a. */
function fakeRoot() {
  const attrs = new Map()
  const themeColorMeta = {
    content: '',
    setAttribute(name, value) {
      if (name === 'content') this.content = value
    },
  }
  return {
    dataset: { skin: '', mode: '' },
    classList: {
      classes: new Set(),
      toggle(name, on) {
        if (on) this.classes.add(name)
        else this.classes.delete(name)
      },
      contains(name) {
        return this.classes.has(name)
      },
    },
    style: {
      colorScheme: '',
      removeProperty(name) {
        if (name === 'color-scheme') this.colorScheme = ''
        attrs.delete(name)
      },
    },
    ownerDocument: {
      querySelector(selector) {
        return selector === 'meta[name="theme-color"]' ? themeColorMeta : null
      },
    },
    themeColorMeta,
  }
}

test('tri i samo tri stanja, `classic` je prvi i default', () => {
  assert.deepEqual(THEME_CHOICES, ['classic', 'aurum-light', 'aurum-dark'])
  assert.equal(Object.keys(THEME_META).length, 3)
  for (const choice of THEME_CHOICES) {
    assert.ok(THEME_META[choice], `nedostaje THEME_META.${choice}`)
  }
  assert.equal(normalizeTheme(undefined), 'classic')
  assert.equal(normalizeTheme(null), 'classic')
  assert.equal(normalizeTheme(''), 'classic')
  assert.equal(normalizeTheme('classic-dark'), 'classic', 'nema kombinacije classic+tamna')
  assert.equal(normalizeTheme('dark'), 'classic', 'nema četvrtog stanja')
  assert.equal(normalizeTheme('AURUM-DARK'), 'classic', 'vrijednosti su case-sensitive')
  assert.equal(normalizeTheme({}), 'classic')
  assert.equal(normalizeTheme('aurum-light'), 'aurum-light')
  assert.equal(normalizeTheme('aurum-dark'), 'aurum-dark')
})

test('localStorage ključ je tačno `nejra.theme` i round-trip pamti izbor', () => {
  assert.equal(THEME_STORAGE_KEY, 'nejra.theme')
  const store = new Map()
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  }
  assert.equal(readStoredTheme(storage), 'classic')
  assert.equal(readStoredTheme(null), 'classic')
  assert.equal(readStoredTheme(undefined), 'classic')
  assert.equal(readStoredTheme({ getItem() { throw new Error('blocked') } }), 'classic')
  for (const choice of THEME_CHOICES) {
    assert.equal(writeStoredTheme(storage, choice), choice)
    assert.equal(store.get('nejra.theme'), choice)
    assert.equal(readStoredTheme(storage), choice)
  }
  store.set('nejra.theme', 'nešto-nepoznato')
  assert.equal(readStoredTheme(storage), 'classic')
  // Nepoznata vrijednost se nikad ne upisuje nazad u storage.
  assert.equal(writeStoredTheme(storage, 'bogus'), 'classic')
  assert.equal(store.get('nejra.theme'), 'classic')
  assert.equal(writeStoredTheme({ setItem() { throw new Error('blocked') } }, 'aurum-dark'), 'aurum-dark')
})

test('applyTheme postavlja tačne atribute, klasu `dark`, color-scheme i meta', () => {
  const cases = [
    ['classic', 'classic', 'light', false, '#0f172a', ''],
    ['aurum-light', 'aurum', 'light', false, '#FAF6EF', 'light'],
    ['aurum-dark', 'aurum', 'dark', true, '#0E0B08', 'dark'],
  ]
  for (const [choice, skin, mode, dark, themeColor, colorScheme] of cases) {
    const root = fakeRoot()
    const meta = root.themeColorMeta
    assert.equal(applyTheme(root, choice), choice)
    assert.equal(root.dataset.skin, skin, `${choice}: data-skin`)
    assert.equal(root.dataset.mode, mode, `${choice}: data-mode`)
    assert.equal(root.classList.contains('dark'), dark, `${choice}: .dark`)
    assert.equal(meta.content, themeColor, `${choice}: theme-color`)
    assert.equal(root.style.colorScheme, colorScheme, `${choice}: color-scheme`)
  }
  // `dark_yes`: samo Aurum tamna smije dodijeliti klasu `dark`.
  const root = fakeRoot()
  applyTheme(root, 'aurum-dark')
  assert.equal(root.classList.contains('dark'), true)
  applyTheme(root, 'classic')
  assert.equal(root.classList.contains('dark'), false, 'povratak na classic uklanja .dark')
  assert.equal(root.style.colorScheme, '', 'classic nema inline color-scheme')
  // Nepoznat izbor se primjenjuje kao classic, ne kao polovično stanje.
  assert.equal(applyTheme(root, 'bogus'), 'classic')
  assert.equal(root.dataset.skin, 'classic')
})

test('nema čitanja sistemske teme niti React-a u modulu (Q8)', () => {
  assert.doesNotMatch(code, /matchMedia|prefers-color-scheme/)
  assert.doesNotMatch(code, /from ['"]react['"]|from ['"]react-dom/)
  assert.doesNotMatch(code, /document\./, 'modul prima root, ne dira globalni document')
})

test('mutacije ugovora se odbijaju (detektor nije prazna provjera)', () => {
  const guards = (src) => [
    src.includes("export const THEME_STORAGE_KEY = 'nejra.theme'"),
    /'classic',\s*'aurum-light',\s*'aurum-dark'/.test(src),
    src.includes("root.dataset.skin = meta.skin"),
    src.includes("root.dataset.mode = meta.mode"),
    src.includes("root.classList.toggle('dark', value === 'aurum-dark')"),
    src.includes('meta[name="theme-color"]'),
    src.includes('THEME_CHOICES.includes(value) ? value :'),
  ].every(Boolean)
  assert.equal(guards(source), true, 'izvorni modul mora zadovoljiti sve ugovore')
  const mutations = [
    ["export const THEME_STORAGE_KEY = 'nejra.theme'", "export const THEME_STORAGE_KEY = 'theme'"],
    ["'classic', 'aurum-light', 'aurum-dark'", "'classic', 'aurum-dark', 'aurum-light'"],
    ["root.classList.toggle('dark', value === 'aurum-dark')", "root.classList.toggle('dark', true)"],
    ["THEME_CHOICES.includes(value) ? value : 'classic'", 'value'],
    ['root.dataset.skin = meta.skin', '// uklonjeno'],
  ]
  for (const [from, to] of mutations) {
    assert.ok(source.includes(from), `mutacija nije našla polazni tekst: ${from}`)
    assert.equal(guards(source.replace(from, to)), false, `mutacija nije uhvaćena: ${from}`)
  }
})
