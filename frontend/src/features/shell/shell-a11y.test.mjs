import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')

const adminLayout = read('./admin/admin-layout.tsx')
const stylistLayout = read('../../layouts/StylistLayout.tsx')
const adminNav = read('./admin/admin-nav-menu.tsx')
const skipLink = read('./admin/ui/skip-link.tsx')
const dashboardTitles = read('../../seo/dashboard-titles.ts')
const bs = JSON.parse(read('../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../i18n/locales/en.json'))

const resolveKey = (locale, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), locale)

test('skip link is the first focusable element of both dashboard shells', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /<SkipLink targetId="main" \/>/)
  }
  assert.match(skipLink, /className="skip-link"/)
  assert.match(skipLink, /t\('shell\.skipToContent'\)/)
})

test('main landmark of both shells is the skip link target and programmatically focusable', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /<main id="main" tabIndex=\{-1\}/)
    assert.match(source, /useFocusOnNavigate\(\)/)
  }
})

test('navigation links expose their current-page state', () => {
  assert.match(adminNav, /aria-current=\{active \? 'page' : undefined\}/)
  assert.match(stylistLayout, /aria-current=\{active \? 'page' : undefined\}/)
})

test('each shell has exactly one named main navigation landmark', () => {
  assert.equal((adminNav.match(/<nav/g) ?? []).length, 1)
  assert.match(adminNav, /aria-label=\{t\('shell\.mainNavigation'\)\}/)
  assert.equal((stylistLayout.match(/<nav/g) ?? []).length, 1)
  assert.match(stylistLayout, /aria-label=\{t\('shell\.mainNavigation'\)\}/)
})

test('help is reachable from a consistent place in both shells', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /to="\/kontakt"/)
    assert.match(source, /t\('shell\.help'\)/)
  }
})

test('forced-colors rules are scoped to the dashboard shells only', () => {
  for (const source of [adminLayout, stylistLayout]) {
    assert.match(source, /className="admin-shell /)
  }
})

test('every dashboard page title key exists in both locales', () => {
  const keys = [...dashboardTitles.matchAll(/key: '([^']+)'/g)].map(([, key]) => key)
  assert.ok(keys.length >= 30, `expected at least 30 route title keys, found ${keys.length}`)
  assert.ok(!keys.some((key) => key.includes(' ')), 'title keys must be i18n keys, not literals')

  for (const key of keys) {
    assert.ok(typeof resolveKey(bs, key) === 'string' && resolveKey(bs, key).length > 0, `missing BS: ${key}`)
    assert.ok(typeof resolveKey(en, key) === 'string' && resolveKey(en, key).length > 0, `missing EN: ${key}`)
  }
})
