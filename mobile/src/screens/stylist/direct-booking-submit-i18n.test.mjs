import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const hook = readFileSync(new URL('./use-stylist-direct-booking-form.ts', import.meta.url), 'utf8')

test('direct-booking validation and result alerts use Bosnian resources', () => {
  for (const [key, copy] of [
    ['noClientError', 'Odaberite klijenta.'],
    ['missingGenderError', 'Klijent nema definisan spol — ažurirajte profil klijenta.'],
    ['successTitle', 'Termin kreiran'],
    ['successMessage', 'Direktna rezervacija je odmah dodana u raspored.'],
    ['errorFallback', 'Kreiranje termina nije uspjelo.'],
  ]) {
    assert.ok(resource.includes(`${key}: '${copy}'`), `Missing alert resource: ${key}`)
    assert.ok(hook.includes(`t('stylist.directBooking.${key}')`), `Submit flow missing key: ${key}`)
  }
  assert.ok(hook.includes("t('common.error')"))
  assert.ok(hook.includes("t('common.ok')"))
  assert.doesNotMatch(hook, /Alert\.alert\('Greška'|Alert\.alert\('Termin kreiran'|Odaberite klijenta\.|Kreiranje termina nije uspjelo\./)
})

test('direct-booking validation, request payload, and completion callbacks remain unchanged', () => {
  assert.match(hook, /if \(!selectedClient\) \{[\s\S]*?return;\s*\}/)
  assert.match(hook, /if \(!selectedClient\.gender\) \{[\s\S]*?return;\s*\}/)
  assert.match(hook, /api\.post\('\/api\/reservations\/stylist\/direct', \{/)
  for (const field of ['clientId: selectedClient.id', 'serviceIds,', 'reservationDate,', 'startTime,', 'endTime,', 'clientNotes: clientNotes.trim() || undefined']) {
    assert.ok(hook.includes(field), `Request payload changed: ${field}`)
  }
  assert.match(hook, /\[\{ text: t\('common\.ok'\), onPress: onCreated \}\]/)
  assert.match(hook, /getApiErrorMessage\(error, t\('stylist\.directBooking\.errorFallback'\)\)/)
  assert.match(hook, /finally \{\s*setSaving\(false\)/)
})
