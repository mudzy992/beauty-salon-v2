import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

/**
 * S10 (2026-11-18) — direktno zakazivanje je podijeljeno na stranicu +
 * hook + tri komponente, pa se provjera čita nad **cijelim** skupom fajlova.
 *
 * Tvrdnje su **nepromijenjene** — iste veze label/kontrola i isti `fieldset`
 * /`legend` /`aria-pressed` ugovori, samo nad agregiranim izvorom.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')

const source = [
  read('pages/stylist-direct-booking-page.tsx'),
  read('hooks/useStylistDirectBooking.ts'),
  read('components/direct-booking-client-field.tsx'),
  read('components/direct-booking-services-fieldset.tsx'),
  read('components/direct-booking-schedule-fields.tsx'),
].join('\n')

test('client, date, time, and notes labels are associated with their controls', () => {
  const controls = [
    ['stylist-direct-booking-client', 'Input'],
    ['stylist-direct-booking-date', 'Input'],
    ['stylist-direct-booking-start', 'Input'],
    ['stylist-direct-booking-end', 'Input'],
    ['stylist-direct-booking-note', 'Textarea'],
  ]
  for (const [id, component] of controls) {
    assert.ok(source.includes(`<Label htmlFor="${id}"`), `Missing label for ${id}`)
    assert.match(source, new RegExp(`<${component}\\s+id="${id}"`), `Missing control id ${id}`)
  }
})

test('service choice group has a legend and client/service choices expose pressed state', () => {
  assert.match(source, /<fieldset className="space-y-2 border-0 p-0">[\s\S]*?<legend[^>]*>\s*\{t\('stylistPortal\.directBooking\.services'\)\}/)
  assert.match(source, /aria-pressed=\{selected\}[\s\S]*?onClick=\{\(\) => onSelectClient\(client\)\}/)
  assert.match(source, /aria-pressed=\{serviceIds\.includes\(service\.id\)\}[\s\S]*?onClick=\{\(\) => onToggleService\(service\.id\)\}/)
})
