import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const page = readFileSync(new URL('../../pages/onboarding/OnboardingEmail.tsx', import.meta.url), 'utf8')
const otpInput = readFileSync(new URL('../../components/ui/otp-input.tsx', import.meta.url), 'utf8')
const sources = [page, otpInput]
const translationKeys = sources.flatMap((source) => [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('email verification onboarding uses matching BS/EN keys and accessible OTP labels', () => {
  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
  assert.deepEqual(
    leafPaths(locales[0].onboarding, 'onboarding').sort(),
    leafPaths(locales[1].onboarding, 'onboarding').sort(),
  )
  assert.match(otpInput, /aria-label=\{`\$\{t\('common\.digit'\)\} \$\{i \+ 1\}`\}/)
  assert.doesNotMatch(page, /Email je obavezan|Poslali smo kod|Verifikacijski kod|Potvrdi email|Pošalji kod ponovo|Unesite 6-znamenkasti kod/)
})

test('email verification API flow, code length, and redirects remain unchanged', () => {
  assert.match(page, /const trimmed = email\.trim\(\)/)
  assert.match(page, /api\.put\('\/api\/users\/profile', \{ email: trimmed \}\)/)
  assert.equal([...page.matchAll(/api\.post\('\/auth\/send-verification-email'\)/g)].length, 2)
  assert.match(page, /const trimmed = code\.trim\(\)/)
  assert.match(page, /if \(trimmed\.length !== 6\)/)
  assert.match(page, /api\.post\('\/auth\/verify-email', \{ token: trimmed \}\)/)
  assert.match(page, /await refreshProfile\(\)/)
  assert.match(page, /navigate\('\/', \{ replace: true \}\)/)
  assert.match(page, /error\?\.response\?\.data\?\.message \|\| t\('onboarding\.verificationFailed'\)/)
  assert.match(page, /error\?\.response\?\.data\?\.message \|\| t\('onboarding\.sendCodeFailed'\)/)
})
