import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const pickers = readFileSync(new URL('./direct-booking-pickers.tsx', import.meta.url), 'utf8')

test('direct-booking picker labels and guidance use Bosnian resources', () => {
  for (const [key, copy] of [
    ['genderMale', 'Muški'],
    ['genderFemale', 'Ženski'],
    ['genderUndefined', 'Spol nije definisan'],
    ['servicesTitle', 'Servisi'],
    ['selectClientPrompt', 'Prvo odaberite klijenta — lista servisa se filtrira po spolu.'],
    ['missingGenderWarning', 'Klijent nema definisan spol. Servisi se ne mogu filtrirati.'],
    ['noServicesForGender', 'Nema aktivnih servisa za odabrani spol.'],
  ]) {
    assert.ok(resource.includes(`${key}: '${copy}'`), `Missing picker resource: ${key}`)
    assert.ok(
      pickers.includes(`t('stylist.directBooking.${key}')`),
      `Picker component missing key: ${key}`,
    )
  }
  assert.doesNotMatch(pickers, /'Muški'|'Ženski'|'Spol nije definisan'|>Servisi<|Prvo odaberite klijenta|Klijent nema definisan spol|Nema aktivnih servisa/)
})

test('client gender and service filtering states and callbacks remain unchanged', () => {
  assert.match(pickers, /clients\.map\(\(client\) =>/)
  assert.match(pickers, /client\.gender === 'MALE'/)
  assert.match(pickers, /client\.gender === 'FEMALE'/)
  assert.match(pickers, /!selectedClient \?/)
  assert.match(pickers, /!selectedClient\.gender \?/)
  assert.match(pickers, /filteredServices\.length === 0 \?/)
  assert.match(pickers, /onPress=\{\(\) => onSelectClient\(client\)\}/)
  assert.match(pickers, /onPress=\{\(\) => onToggleServiceId\(service\.id\)\}/)
  assert.match(pickers, /serviceIds\.includes\(service\.id\)/)
})
