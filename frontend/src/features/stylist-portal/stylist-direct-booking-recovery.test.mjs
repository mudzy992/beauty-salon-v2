import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-direct-booking-page.tsx', import.meta.url), 'utf8')

test('service and client loading distinguish failures from successful empty results', () => {
  assert.match(source, /setServicesLoadError\(true\)/)
  assert.match(source, /setClientSearchError\(true\)/)
  assert.match(source, /serviceLoadFailed/)
  assert.match(source, /clientSearchFailed/)
  assert.match(source, /directBooking\.noServices/)
  assert.match(source, /directBooking\.noClients/)
  assert.match(source, /Array\.isArray\(result\)/)
  assert.match(source, /Array\.isArray\(data\?\.items\)/)
})

test('both read failures expose retry controls and loading states are announced', () => {
  assert.match(source, /onClick=\{\(\) => void loadServices\(\)\}/)
  assert.match(source, /onClick=\{\(\) => void searchClients\(clientSearch\.trim\(\)\)\}/)
  assert.equal((source.match(/role="status" aria-live="polite"/g) ?? []).length, 2)
  assert.equal((source.match(/role="alert"/g) ?? []).length, 2)
})

test('superseded client searches and service loads cannot overwrite newer state', () => {
  assert.match(source, /const requestId = \+\+servicesRequestIdRef\.current/)
  assert.match(source, /requestId === servicesRequestIdRef\.current/)
  assert.match(source, /const requestId = \+\+clientSearchRequestIdRef\.current/)
  assert.match(source, /requestId === clientSearchRequestIdRef\.current/)
  assert.match(source, /clientSearchRequestIdRef\.current \+= 1[\s\S]*?setClients\(\[\]\)/)
  assert.match(source, /clearTimeout\(handle\)[\s\S]*?clientSearchRequestIdRef\.current \+= 1/)
})
