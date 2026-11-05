import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-direct-booking-page.tsx', import.meta.url), 'utf8')

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
  assert.match(source, /aria-pressed=\{selected\}[\s\S]*?onClick=\{\(\) => handleSelectClient\(client\)\}/)
  assert.match(source, /aria-pressed=\{serviceIds\.includes\(service\.id\)\}[\s\S]*?onClick=\{\(\) => toggleServiceId\(service\.id\)\}/)
})
