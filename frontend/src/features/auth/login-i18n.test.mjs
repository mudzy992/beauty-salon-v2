import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL(`../../i18n/locales/${language}.json`, import.meta.url),
      'utf8',
    ),
  ),
)
const loginSource = readFileSync(new URL('../../pages/Login.tsx', import.meta.url), 'utf8')
const getLocaleValue = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)

test('login identifier placeholder is localized in Bosnian and English', () => {
  assert.match(loginSource, /placeholder=\{t\('auth\.loginIdentifierPlaceholder'\)\}/)
  assert.doesNotMatch(loginSource, /placeholder="vasemail@example\.com"/)

  const placeholders = resources.map((resource) =>
    getLocaleValue(resource, 'auth.loginIdentifierPlaceholder'),
  )
  assert.ok(placeholders.every((placeholder) => typeof placeholder === 'string' && placeholder.length > 0))
  assert.notEqual(placeholders[0], placeholders[1])
})
