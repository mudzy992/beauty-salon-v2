import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicReserve.tsx', import.meta.url), 'utf8')
const bsLocale = JSON.parse(readFileSync(new URL('../../i18n/locales/bs.json', import.meta.url), 'utf8'))
const enLocale = JSON.parse(readFileSync(new URL('../../i18n/locales/en.json', import.meta.url), 'utf8'))

test('service search has an accessible name in both autocomplete states', () => {
  assert.ok(source.includes('htmlFor="public-service-search"'))
  assert.equal([...source.matchAll(/<Input\s+id="public-service-search"/g)].length, 2)
})

test('date and time choices are grouped with programmatic legends', () => {
  assert.match(source, /<fieldset[\s\S]*?<legend[^>]*>[\s\S]*?public\.reserve\.selectDate[\s\S]*?<\/legend>[\s\S]*?<ReservationCalendar/)
  assert.match(source, /<fieldset className="min-w-0 space-y-2 border-0 p-0">\s*<legend[^>]*>[\s\S]*?public\.reserve\.selectTime/)
})

test('notes and loyalty percentage controls have associated labels', () => {
  assert.match(source, /<Label[\s\S]*?htmlFor="reservation-notes"[\s\S]*?<\/Label>\s*<Textarea\s+id="reservation-notes"/)
  assert.match(source, /<Label[\s\S]*?htmlFor="loyalty-discount-percent"[\s\S]*?<\/Label>\s*<Input\s+id="loyalty-discount-percent"/)
})

test('calendar navigation and selectable dates expose names and selected states', () => {
  const calendar = source.slice(
    source.indexOf('const ReservationCalendar'),
    source.indexOf('export default function PublicReserve'),
  )
  assert.match(calendar, /aria-label=\{t\('common\.previous'\)\}[\s\S]*?<ChevronLeft[^>]*aria-hidden="true"/)
  assert.match(calendar, /aria-label=\{t\('common\.next'\)\}[\s\S]*?<ChevronRight[^>]*aria-hidden="true"/)
  assert.match(calendar, /aria-label=\{`\$\{formatDateOnlyLocale\(dateStr, locale,/)
  assert.match(calendar, /aria-pressed=\{isSelected\}/)
})

test('service, date, and slot request failures remain distinct from valid empty results and offer retry', () => {
  assert.match(source, /setServicesLoadError\(true\)/)
  assert.match(source, /servicesLoadError \? \([\s\S]*?public\.reserve\.servicesLoadFailed[\s\S]*?void loadServices\(\)/)
  assert.match(source, /datesLoadError \? \([\s\S]*?public\.reserve\.datesLoadFailed[\s\S]*?loadAvailability\(selectedServiceIds\)/)
  assert.match(source, /slotsLoadError \? \([\s\S]*?public\.reserve\.slotsLoadFailed[\s\S]*?loadSlots\(selectedServiceIds, selectedDate\)/)
  assert.match(source, /slotsLoadError \? \([\s\S]*?\) : loadingSlots \? \([\s\S]*?\) : slots\.length === 0 \? \(/)
})

test('stale date and slot responses cannot overwrite the latest selection', () => {
  assert.match(source, /const requestId = \+\+datesRequestIdRef\.current/)
  assert.match(source, /requestId !== datesRequestIdRef\.current/)
  assert.match(source, /return \(\) => \{\s*datesRequestIdRef\.current \+= 1\s*\}/)
  assert.match(source, /const requestId = \+\+slotsRequestIdRef\.current/)
  assert.match(source, /requestId !== slotsRequestIdRef\.current/)
  assert.match(source, /return \(\) => \{\s*slotsRequestIdRef\.current \+= 1\s*\}/)
})

test('reservation recovery messages are present in both supported locales', () => {
  for (const key of ['servicesLoadFailed', 'datesLoadFailed', 'slotsLoadFailed']) {
    assert.equal(typeof bsLocale.public.reserve[key], 'string')
    assert.equal(typeof enLocale.public.reserve[key], 'string')
    assert.ok(bsLocale.public.reserve[key].length > 0)
    assert.ok(enLocale.public.reserve[key].length > 0)
  }
})
