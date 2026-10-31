import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const dailyLog = readFileSync(new URL('./DailyLogNewEntryScreen.tsx', import.meta.url), 'utf8')
const bookingForm = readFileSync(new URL('./use-stylist-direct-booking-form.ts', import.meta.url), 'utf8')
const bookingScreen = readFileSync(new URL('./StylistDirectBookingScreen.tsx', import.meta.url), 'utf8')
const bookingPickers = readFileSync(new URL('./direct-booking-pickers.tsx', import.meta.url), 'utf8')
const translations = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('daily-log services and clients load independently and preserve successful data on failure', () => {
  assert.doesNotMatch(dailyLog, /Promise\.all/)
  assert.match(dailyLog, /const loadServices = useCallback/)
  assert.match(dailyLog, /const loadClients = useCallback/)
  assert.match(dailyLog, /if \(serviceLoadGeneration\.current === generation\) setServicesLoadError\(true\)/)
  assert.match(dailyLog, /if \(clientLoadGeneration\.current === generation\) setClientsLoadError\(true\)/)
  assert.doesNotMatch(dailyLog, /catch \{\s*setServices\(\[\]\)/)
  assert.doesNotMatch(dailyLog, /catch \{\s*setClients\(\[\]\)/)
  assert.match(dailyLog, /clients\.length > 0\s*\? 'stylist\.dailyLogDetail\.clientListStaleMessage'/)
  assert.match(dailyLog, /services\.length > 0 \? 'services\.staleMessage'/)
  assert.match(dailyLog, /onPress=\{\(\) => void loadClients\(\)\}/)
  assert.match(dailyLog, /onPress=\{\(\) => void loadServices\(\)\}/)
})

test('direct-booking catalogue and client search expose errors and retry without masking failure as empty data', () => {
  assert.match(bookingForm, /const loadServices = useCallback/)
  assert.match(bookingForm, /setServicesLoadError\(true\)/)
  assert.doesNotMatch(bookingForm, /\.catch\(\(\) => setServices\(\[\]\)\)/)
  assert.match(bookingForm, /setClientSearchLoadError\(true\)/)
  assert.match(bookingForm, /handleRetryClientSearch/)
  assert.match(bookingForm, /retryServices: loadServices/)
  assert.match(bookingScreen, /stylist\.directBooking\.clientSearchLoadError/)
  assert.match(bookingScreen, /form\.handleRetryClientSearch/)
  assert.match(bookingScreen, /form\.retryServices/)
  assert.match(bookingScreen, /services\.staleMessage/)
  assert.match(bookingScreen, /common\.noResults/)
  assert.match(bookingPickers, /servicesLoading \|\| servicesLoadError \? null/)
})

test('picker recovery notices use localized Bosnian messages and retry actions', () => {
  for (const [key, copy] of [
    ['clientListLoadError', 'Klijente nije moguće učitati. Pokušajte ponovo.'],
    ['clientListStaleMessage', 'Prikazujemo ranije učitane klijente; osvježavanje nije uspjelo.'],
    ['clientSearchLoadError', 'Pretragu klijenata nije moguće učitati. Pokušajte ponovo.'],
  ]) {
    assert.ok(translations.includes(`${key}: '${copy}'`), `Missing localized copy: ${key}`)
  }
  assert.match(dailyLog, /title=\{t\('common\.retry'\)\}/)
  assert.match(bookingScreen, /title=\{t\('common\.retry'\)\}/)
})
