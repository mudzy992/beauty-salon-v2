import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../../pages/Users.tsx', import.meta.url), 'utf8')
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)

test('admin user creation only displays the server-generated one-time password', () => {
  assert.match(page, /const initialPassword = response\.data\?\.initialPassword/)
  assert.doesNotMatch(page, /DEFAULT_INITIAL_PASSWORD|Init\d{4}!/)
  assert.match(page, /setCreatedCredentials\(\{ username, initialPassword \}\)/)
  assert.match(page, /if \(!open\) setCreatedCredentials\(null\)/)
  for (const locale of locales) {
    assert.equal(typeof locale.users.credentials.unavailable, 'string')
  }
})
