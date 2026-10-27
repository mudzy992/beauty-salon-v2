import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/onboarding/OnboardingGender.tsx', import.meta.url), 'utf8')
const translationKeys = [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('gender onboarding UI references matching BS/EN translations', () => {
  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
  assert.deepEqual(
    leafPaths(locales[0].onboarding, 'onboarding').sort(),
    leafPaths(locales[1].onboarding, 'onboarding').sort(),
  )
  assert.doesNotMatch(source, /Vaš spol|Odaberite spol|Muški|Ženski|Nastavi/)
})

test('gender values, profile payload and onboarding navigation remain unchanged', () => {
  assert.match(source, /type Gender = 'MALE' \| 'FEMALE'/)
  assert.match(source, /setGender\('MALE'\)/)
  assert.match(source, /setGender\('FEMALE'\)/)
  assert.match(source, /api\.put\('\/api\/users\/profile', \{ gender \}\)/)
  assert.match(source, /await refreshProfile\(\)/)
  assert.match(source, /navigate\('\/onboarding\/email', \{ replace: true \}\)/)
  assert.match(source, /user\.genderOnboardingCompleted === true/)
  assert.match(source, /error\?\.response\?\.data\?\.message \|\| t\('onboarding\.profileSaveFailed'\)/)
})
