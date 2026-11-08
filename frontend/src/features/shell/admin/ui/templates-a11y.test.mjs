import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8')

const dataTable = read('./data-table.tsx')
const statusBadge = read('./status-badge.tsx')
const pagination = read('./table-pagination.tsx')
const filterBar = read('./filter-bar.tsx')
const pageHeader = read('./page-header.tsx')
const formSection = read('./form-section.tsx')
const bs = JSON.parse(read('../../../../i18n/locales/bs.json'))
const en = JSON.parse(read('../../../../i18n/locales/en.json'))

const resolveKey = (locale, key) =>
  key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), locale)

test('data table exposes an accessible name and column header semantics', () => {
  assert.match(dataTable, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(dataTable, /scope="col"/)
  assert.match(dataTable, /aria-sort=\{/)
  assert.match(dataTable, /'ascending'/)
  assert.match(dataTable, /'descending'/)
})

test('every data cell keeps its column label for the sub-640px card mode', () => {
  assert.match(dataTable, /data-label=\{t\(column\.headerKey\)\}/)

  const css = read('../../../../index.css')
  assert.match(css, /table\.data-table tbody td::before/)
  assert.match(css, /content: attr\(data-label\)/)
  assert.match(css, /@media \(max-width: 639px\)/)
})

test('sort control has a textual name and the direction is not conveyed by color alone', () => {
  assert.match(dataTable, /aria-label=\{t\('table\.sortBy', \{ column: t\(column\.headerKey\) \}\)\}/)
  assert.match(dataTable, /<SortIndicator direction=\{direction\} \/>/)
  assert.match(dataTable, /aria-hidden className="h-3\.5 w-3\.5/)
})

test('status badge never relies on color alone', () => {
  // WCAG 1.4.1 — uz ton idu ikona i tekst.
  assert.match(statusBadge, /<Icon aria-hidden className="h-3\.5 w-3\.5 shrink-0" \/>/)
  // Tekst je uvijek prisutan: `label` je opciono prepisivanje (dinamički status
  // s fallback-om), a default i dalje ide preko t().
  assert.match(statusBadge, /\{label \?\? t\(status\.labelKey\)\}/)

  const tones = ['ok', 'warn', 'bad', 'info', 'neutral']
  for (const tone of tones) {
    assert.match(statusBadge, new RegExp(`${tone}: 'bg-${tone} text-${tone}-foreground'`))
  }
})

test('reservation status map reuses existing reservation i18n keys in both locales', () => {
  // Asertacija je ograničena na `reservationStatusMap`: `resolveReservationStatus`
  // namjerno ima fallback izvan tog namespacea (nepoznat status s API-ja), pa se
  // provjerava zasebno ispod.
  const mapSource = statusBadge.slice(
    statusBadge.indexOf('export const reservationStatusMap'),
    statusBadge.indexOf('export const resolveReservationStatus'),
  )
  const keys = [...mapSource.matchAll(/labelKey: '([^']+)'/g)].map(([, key]) => key)
  assert.equal(keys.length, 11, `expected 11 reservation statuses, found ${keys.length}`)

  for (const key of keys) {
    assert.ok(key.startsWith('reservations.statuses.'), `unexpected key namespace: ${key}`)
    assert.ok(typeof resolveKey(bs, key) === 'string' && resolveKey(bs, key).length > 0, `missing BS: ${key}`)
    assert.ok(typeof resolveKey(en, key) === 'string' && resolveKey(en, key).length > 0, `missing EN: ${key}`)
  }

  // Fallback za nepoznati status također mora biti preveden u oba jezika.
  const fallback = statusBadge.slice(statusBadge.indexOf('export const resolveReservationStatus'))
  const fallbackKey = fallback.match(/labelKey: '([^']+)'/)?.[1]
  assert.ok(fallbackKey, 'resolveReservationStatus mora imati fallback labelKey')
  assert.ok(typeof resolveKey(bs, fallbackKey) === 'string', `missing BS: ${fallbackKey}`)
  assert.ok(typeof resolveKey(en, fallbackKey) === 'string', `missing EN: ${fallbackKey}`)
})

test('pagination is a named landmark with named controls and a polite range', () => {
  assert.match(pagination, /<nav/)
  assert.match(pagination, /aria-label=\{t\('table\.pagination'\)\}/)
  assert.match(pagination, /aria-label=\{t\('table\.previous'\)\}/)
  assert.match(pagination, /aria-label=\{t\('table\.next'\)\}/)
  assert.match(pagination, /role="status" aria-live="polite"/)
  assert.match(pagination, /disabled=\{!hasPrev\}/)
  assert.match(pagination, /disabled=\{!hasNext\}/)
})

test('filter bar is a named search landmark with a polite result summary', () => {
  assert.match(filterBar, /role="search"/)
  assert.match(filterBar, /aria-label=\{t\('table\.filterResults'\)\}/)
  assert.match(filterBar, /role="status" aria-live="polite"/)
})

/** Uklanja /* *\/ i // komentare da se broje JSX elementi, a ne spominjanja u tekstu. */
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

test('page header carries exactly one h1 and form section groups with fieldset', () => {
  const jsx = stripComments(pageHeader)
  assert.equal((jsx.match(/<h1[\s>]/g) ?? []).length, 1)
  assert.doesNotMatch(jsx, /<h[2-6][\s>]/, 'PageHeader must not add competing headings')
  assert.match(formSection, /<fieldset/)
  assert.match(formSection, /<legend/)
})

test('templates contain no hardcoded user-facing strings', () => {
  // Svaki vidljivi tekst mora ići kroz t(); dozvoljeni su samo aria-hidden ikone
  // i tehničke vrijednosti (klase, data atributi).
  const suspects = [dataTable, pagination, filterBar, statusBadge]
  for (const source of suspects) {
    assert.doesNotMatch(source, />\s*[A-ZČĆŠŽĐ][a-zčćšžđ]{3,}\s*</u, 'literal text node found')
  }
})
