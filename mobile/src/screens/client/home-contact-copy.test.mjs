import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('home contact section has localized action names and hints for its destinations', () => {
  assert.match(resources, /contactSectionTitle: 'Kontakt'/)
  assert.match(resources, /contactDetailsAction: 'Detalji'/)
  assert.match(resources, /contactDetailsLabel: 'Detalji kontakta'/)
  assert.match(resources, /contactDetailsHint: 'Otvara stranicu sa svim kontakt-podacima\.'/)
  assert.match(resources, /phoneContactLabel: 'Nazovi \{\{phone\}\}'/)
  assert.match(resources, /phoneContactHint: 'Pokreće poziv na ovaj broj\.'/)
  assert.match(resources, /emailContactLabel: 'Pošalji email na \{\{email\}\}'/)
  assert.match(resources, /emailContactHint: 'Otvara aplikaciju za email\.'/)
  assert.match(resources, /socialContactHint: 'Otvara profil na mreži \{\{network\}\}\.'/)
})
