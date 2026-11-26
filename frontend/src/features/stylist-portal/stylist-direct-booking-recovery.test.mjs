import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

/**
 * S10 (2026-11-18) — direktno zakazivanje je podijeljeno na stranicu +
 * hook + tri komponente, pa se provjera čita nad **cijelim** skupom fajlova.
 *
 * Tvrdnje su **nepromijenjene** — iste regex/provjere, samo nad agregiranim
 * izvorom umjesto nad jednim monolitnim fajlom.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')

const source = [
  read('pages/stylist-direct-booking-page.tsx'),
  read('hooks/useStylistDirectBooking.ts'),
  read('hooks/useStylistDirectBookingCatalog.ts'),
  read('hooks/useStylistDirectBookingSubmission.ts'),
  read('components/direct-booking-client-field.tsx'),
  read('components/direct-booking-services-fieldset.tsx'),
  read('components/direct-booking-schedule-fields.tsx'),
].join('\n')

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
  // S10 (2026-11-18): dugmad za „pokušaj ponovo" više ne pozivaju loadere
  // direktno (`onClick={() => void loadServices()}`), nego komponenti dobijaju
  // callback. Tvrdnja se prilagodila **namjerno**: provjerava se da callback
  // postoji, da komponenta vezuje dugme za njega (`onClick={onRetry…}`) i da
  // poziv i dalje nosi isti argument (`clientSearch.trim()`).
  assert.match(source, /onRetryServices=\{\(\) => void booking\.loadServices\(\)\}/)
  assert.match(source, /onRetrySearch=\{\(\) => void booking\.searchClients\(booking\.clientSearch\.trim\(\)\)\}/)
  assert.match(source, /onClick=\{onRetryServices\}/)
  assert.match(source, /onClick=\{onRetrySearch\}/)
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
