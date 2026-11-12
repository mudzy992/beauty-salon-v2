import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const nav = read('./admin-nav.ts')
const calendar = read('../../../pages/ReservationsCalendar.tsx')

test('approved five navigation groups preserve the 17 original hrefs', () => {
  const groups = [...nav.matchAll(/labelKey: 'nav\.section(\w+)',\s*items: \[([\s\S]*?)\],/g)]
  assert.deepEqual(groups.map((g) => g[1]), ['Overview', 'Operational', 'Salon', 'Content', 'System'])
  const hrefs = [...nav.matchAll(/\{ path: '([^']+)', labelKey: '[^']+'(?:, tab: '([^']+)')?/g)]
    .map(([, path, tab]) => tab ? `${path}?tab=${tab}` : path)
  assert.deepEqual(hrefs, ['/admin', '/admin/analytics', '/admin/reservations', '/admin/daily-log', '/admin/finance', '/admin/loyalty', '/admin/salon', '/admin/services', '/admin/stylists', '/admin/users', '/admin/blog', '/admin/gallery', '/admin/reviews', '/admin/settings?tab=site', '/admin/settings?tab=releases', '/admin/settings?tab=notifications', '/admin/settings?tab=email'])
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
