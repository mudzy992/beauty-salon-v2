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

test('reservation progress exposes the current step with localized text', () => {
  assert.match(
    source,
    /role="progressbar"[\s\S]*?aria-label=\{t\('public\.reserve\.progress'\)\}[\s\S]*?aria-valuemin=\{1\}[\s\S]*?aria-valuemax=\{4\}[\s\S]*?aria-valuenow=\{step\}[\s\S]*?aria-valuetext=\{t\('public\.reserve\.progressStep', \{ current: step, total: 4 \}\)\}/,
  )
  assert.ok(bsLocale.public.reserve.progress.length > 0)
  assert.ok(enLocale.public.reserve.progress.length > 0)
  assert.ok(bsLocale.public.reserve.progressStep.includes('{{current}}'))
  assert.ok(enLocale.public.reserve.progressStep.includes('{{total}}'))

  // Traka s tačkama je dekorativna: `aria-valuetext` vec kaze "Korak X od Y", pa
  // AT ne smije preko toga procitati i gole brojeve 1 2 3 4.
  assert.match(
    source,
    /\{\[1, 2, 3, 4\]\.map\(\(s\) => \(\s*<div key=\{s\} aria-hidden="true"/,
    'svaka tacka indikatora mora biti aria-hidden',
  )
})

test('sve lucide ikone u PublicReserve su dekorativne (1.1.1 / 4.1.2)', () => {
  // Spisak ikona se cita iz importa, pa test hvata i novododate ikone.
  const importBlock = source.match(/import \{([^}]*)\} from 'lucide-react'/)
  assert.ok(importBlock, 'PublicReserve mora importovati lucide-react')
  const icons = importBlock[1].split(',').map((x) => x.trim()).filter(Boolean)
  assert.ok(icons.length >= 6, `ocekivano najmanje 6 ikona, nadjeno ${icons.length}`)

  const offenders = []
  for (const name of icons) {
    for (const tag of source.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'g'))) {
      if (!tag[1].includes('aria-hidden')) offenders.push(`<${name}>`)
    }
  }
  assert.deepEqual(
    offenders,
    [],
    'ikona bez aria-hidden: svaka ovdje stoji uz tekst ili uz input, dakle dekorativna je',
  )

  // Pozitivna kontrola: obrazac zaista hvata ikonu bez aria-hidden.
  assert.match('<Clock className="h-4 w-4" />', /<Clock\b([^>]*)>/)
  assert.ok(!'<Clock className="h-4 w-4" />'.match(/<Clock\b([^>]*)>/)[1].includes('aria-hidden'))
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
