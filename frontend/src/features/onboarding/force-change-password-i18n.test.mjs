import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/ForceChangePassword.tsx', import.meta.url), 'utf8')
const translationKeys = [...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key)
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) => key.split('.').reduce((value, part) => value?.[part], resource)

test('forced password-change UI references matching BS/EN keys', () => {
  for (const locale of locales) {
    for (const key of translationKeys) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
  assert.deepEqual(
    leafPaths(locales[0].onboarding, 'onboarding').sort(),
    leafPaths(locales[1].onboarding, 'onboarding').sort(),
  )
  assert.doesNotMatch(source, /Promjena inicijalne lozinke|Trenutna lozinka|Nova lozinka|Potvrda lozinke nije ispravna/)
})

test('password validation and authentication flow remain unchanged', () => {
  assert.match(source, /if \(newPassword\.length < 6\)/)
  assert.match(source, /if \(newPassword !== confirmPassword\)/)
  assert.match(source, /api\.post<\{ access_token: string \}>\(\s*'\/auth\/change-password',\s*\{ currentPassword, newPassword \},\s*\)/)
  assert.match(source, /replaceToken\(response\.data\.access_token\)/)
  assert.match(source, /const updated = await refreshProfile\(\)/)
  assert.match(source, /navigate\(getPostAuthRedirectPath\(updated\), \{ replace: true \}\)/)
  assert.match(source, /error\?\.response\?\.data\?\.message \|\| t\('onboarding\.passwordChangeFailed'\)/)
})
