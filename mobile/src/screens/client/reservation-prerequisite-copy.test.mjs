import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')

test('reservation prerequisite alerts use localized Bosnian copy', () => {
  assert.match(resources, /genderRequiredMessage: 'Spol je obavezan za rezervacije\. Molimo dopunite profil\.'/)
  assert.match(resources, /initialPasswordRequiredMessage: 'Prvo morate promijeniti inicijalnu lozinku\.'/)
  assert.match(resources, /contactVerificationRequiredMessage: 'Za rezervaciju unesite email i telefon te verifikujte email\.'/)
  assert.match(screen, /Alert\.alert\(\s*t\('common\.error'\),\s*t\('reservation\.genderRequiredMessage'\)/)
  assert.match(screen, /Alert\.alert\(t\('common\.error'\), t\('reservation\.initialPasswordRequiredMessage'\)/)
  assert.match(screen, /Alert\.alert\(\s*t\('common\.error'\),\s*t\('reservation\.contactVerificationRequiredMessage'\)/)
})
