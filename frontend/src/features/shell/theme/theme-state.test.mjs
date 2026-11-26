/** `test:theme-state` — Aurum light/dark only, DOM attributes and storage round-trip. */
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
function blankComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_m, p1) => p1)
}
const code = blankComments(source)

function fakeRoot() {
  const themeColorMeta = { content: '', setAttribute(name, value) { if (name === 'content') this.content = value } }
  return {
    dataset: { skin: '', mode: '' },
    classList: {
      classes: new Set(),
      toggle(name, on) { if (on) this.classes.add(name); else this.classes.delete(name) },
      contains(name) { return this.classes.has(name) },
    },
    style: { colorScheme: '' },
    ownerDocument: { querySelector(selector) { return selector === 'meta[name="theme-color"]' ? themeColorMeta : null } },
    themeColorMeta,
  }
}

test('the only supported choices are Aurum light and dark; legacy/unknown values fall back to light', () => {
  assert.deepEqual(THEME_CHOICES, ['aurum-light', 'aurum-dark'])
  assert.equal(Object.keys(THEME_META).length, 2)
  for (const choice of THEME_CHOICES) assert.ok(THEME_META[choice])
  for (const legacy of ['retired-mode', 'retired-mode-dark', 'dark', 'AURUM-DARK', '', null, undefined, {}]) {
    assert.equal(normalizeTheme(legacy), 'aurum-light')
  }
  assert.equal(normalizeTheme('aurum-light'), 'aurum-light')
  assert.equal(normalizeTheme('aurum-dark'), 'aurum-dark')
})

test('localStorage round-trips the two Aurum modes and tolerates unavailable storage', () => {
  assert.equal(THEME_STORAGE_KEY, 'nejra.theme')
  const store = new Map()
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  }
  assert.equal(readStoredTheme(storage), 'aurum-light')
  assert.equal(readStoredTheme(null), 'aurum-light')
  assert.equal(readStoredTheme(undefined), 'aurum-light')
  assert.equal(readStoredTheme({ getItem() { throw new Error('blocked') } }), 'aurum-light')
  for (const choice of THEME_CHOICES) {
    assert.equal(writeStoredTheme(storage, choice), choice)
    assert.equal(store.get(THEME_STORAGE_KEY), choice)
    assert.equal(readStoredTheme(storage), choice)
  }
  store.set(THEME_STORAGE_KEY, 'retired-mode')
  assert.equal(readStoredTheme(storage), 'aurum-light')
  assert.equal(writeStoredTheme(storage, 'retired-mode'), 'aurum-light')
  assert.equal(store.get(THEME_STORAGE_KEY), 'aurum-light')
  assert.equal(writeStoredTheme({ setItem() { throw new Error('blocked') } }, 'aurum-dark'), 'aurum-dark')
})

test('applyTheme always sets Aurum and applies the exact light/dark metadata', () => {
  const cases = [
    ['aurum-light', 'light', false, '#FAF6EF'],
    ['aurum-dark', 'dark', true, '#0E0B08'],
  ]
  for (const [choice, mode, dark, themeColor] of cases) {
    const root = fakeRoot()
    assert.equal(applyTheme(root, choice), choice)
    assert.equal(root.dataset.skin, 'aurum')
    assert.equal(root.dataset.mode, mode)
    assert.equal(root.classList.contains('dark'), dark)
    assert.equal(root.themeColorMeta.content, themeColor)
    assert.equal(root.style.colorScheme, mode)
  }
  const root = fakeRoot()
  applyTheme(root, 'retired-mode')
  assert.equal(root.dataset.skin, 'aurum')
  assert.equal(root.dataset.mode, 'light')
  assert.equal(root.classList.contains('dark'), false)
})

test('theme state has no retired choice or operating-system auto mode', () => {
  assert.doesNotMatch(code, /matchMedia|prefers-color-scheme/)
  assert.doesNotMatch(code, /from ['"]react['"]|from ['"]react-dom/)
  assert.doesNotMatch(code, /document\./)
})

test('mutations to the two-mode contract are detected', () => {
  const guards = (src) => [
    src.includes("export const THEME_STORAGE_KEY = 'nejra.theme'"),
    /\['aurum-light', 'aurum-dark'\]/.test(src),
    src.includes("root.dataset.skin = 'aurum'"),
    src.includes("root.dataset.mode = meta.mode"),
    src.includes("root.classList.toggle('dark', value === 'aurum-dark')"),
    src.includes('meta[name="theme-color"]'),
    src.includes("THEME_CHOICES.includes(value) ? value : 'aurum-light'"),
  ].every(Boolean)
  assert.equal(guards(source), true)
  const mutations = [
    ["export const THEME_STORAGE_KEY = 'nejra.theme'", "export const THEME_STORAGE_KEY = 'theme'"],
    ["['aurum-light', 'aurum-dark']", "['aurum-dark', 'aurum-light']"],
    ["root.classList.toggle('dark', value === 'aurum-dark')", "root.classList.toggle('dark', true)"],
    ["THEME_CHOICES.includes(value) ? value : 'aurum-light'", 'value'],
    ["root.dataset.skin = 'aurum'", '// removed'],
  ]
  for (const [from, to] of mutations) {
    assert.ok(source.includes(from), `missing mutation source: ${from}`)
    assert.equal(guards(source.replace(from, to)), false, `mutation not caught: ${from}`)
  }
})

import './theme-policy.test.mjs'
import './theme-provider-runtime.test.mjs'
