import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('home satisfied-clients section has localized title, fallbacks, and transformation action', () => {
  assert.match(resources, /satisfiedClientsTitle: 'Zadovoljni klijenti'/)
  assert.match(resources, /featuredReviewFallback: 'Odličan servis i atmosfera, preporučujem!'/)
  assert.match(resources, /satisfiedClientFallback: 'Zadovoljni klijent'/)
  assert.match(resources, /satisfiedClientsEmptyHint: 'Naši klijenti dijele iskustva\. Pogledajte transformacije i recenzije\.'/)
  assert.match(resources, /viewAllTransformations: 'Pogledaj sve transformacije'/)
})
