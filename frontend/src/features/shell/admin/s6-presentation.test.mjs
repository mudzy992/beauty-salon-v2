import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const nav = read('./admin-nav.ts')
const calendar = read('../../../pages/ReservationsCalendar.tsx')

test('six navigation groups group analytics subviews and consolidate settings tabs', () => {
  const groups = [...nav.matchAll(/labelKey: 'nav\.section(\w+)',\s*items: \[([\s\S]*?)\],/g)]
  assert.deepEqual(groups.map((g) => g[1]), ['Overview', 'Analytics', 'Operational', 'Salon', 'Content', 'System'])
  // Zadani tab (tabDefault) ne piše ?tab= u URL-u — isto pravilo kao finance-page.
  const hrefs = [...nav.matchAll(/\{ path: '([^']+)', labelKey: '[^']+'(?:, tab: '([^']+)')?(, tabDefault: true)?/g)]
    .map(([, path, tab, tabDefault]) => (tab && !tabDefault) ? `${path}?tab=${tab}` : path)
  assert.deepEqual(hrefs, [
    '/admin',
    '/admin/analytics',
    '/admin/analytics?tab=clients',
    '/admin/analytics?tab=stylists',
    '/admin/reservations',
    '/admin/daily-log',
    '/admin/finance',
    '/admin/loyalty',
    '/admin/salon',
    '/admin/services',
    '/admin/stylists',
    '/admin/users',
    '/admin/blog',
    '/admin/gallery',
    '/admin/reviews',
    '/admin/settings',
  ])
})

test('fullscreen calendar has a skip target and theme switcher in the header', () => {
  assert.match(calendar, /<SkipLink targetId="calendar-main"\s*\/>/)
  assert.match(calendar, /<main id="calendar-main" tabIndex=\{-1\}/)
  const header = calendar.slice(calendar.indexOf('<header '), calendar.indexOf('</header>'))
  assert.match(header, /<h1/)
  assert.match(header, /<ThemeSwitcher\s*\/>/)
  assert.match(header, /<LanguageSwitcher\s*\/>/)
})

const reservations = read('../../../pages/Reservations.tsx')
test('mobile reservation cards retain price and stylist information', () => {
  const mobile = reservations.slice(reservations.indexOf('className="grid grid-cols-1 gap-3 p-3 lg:hidden"'), reservations.indexOf('className="hidden app-table-wrap lg:block"'))
  assert.match(mobile, /priceBlock\(r\)/)
  assert.match(mobile, /getListStylistName\(r.confirmedStylist\)/)
  assert.match(mobile, /openDetail\(r\)/)
})

test('every navigation destination has a decorative icon and keeps its translated label', () => {
  const menu = read('./admin-nav-menu.tsx')
  const keys = [...nav.matchAll(/\{ path: '[^']+', labelKey: '(nav\.[^']+)'/g)].map(([, key]) => key)
  for (const key of keys) assert.ok(menu.includes(`'${key}':`), `missing icon for ${key}`)
  assert.match(menu, /<Icon data-aurum-nav-icon aria-hidden="true"/)
  assert.match(menu, /\{t\(item.labelKey\)\}/)
  const css = read('../../../styles/globals.css')
  assert.match(css, /\[data-aurum-nav-icon\] \{ display: none; \}/)
  assert.match(css, /\[data-skin="aurum"\] \[data-aurum-nav-icon\] \{ display: block; \}/)
})

test('Aurum table headings and calendar backgrounds use paired semantic tokens', () => {
  const css = read('../../../styles/globals.css')
  assert.match(css, /\[data-skin="aurum"\] \.admin-shell table\.app-table th\s*\{\s*color:\s*hsl\(var\(--text-muted\)\)/)
  assert.match(css, /\[data-skin="aurum"\] \[data-aurum-calendar\] \.rbc-time-gutter\s*\{\s*background-color:\s*hsl\(var\(--surface\)\)/)
  assert.match(css, /\[data-skin="aurum"\] \[data-aurum-calendar\] \.rbc-today\s*\{\s*background-color:\s*hsl\(var\(--surface-muted\)\)/)
})
