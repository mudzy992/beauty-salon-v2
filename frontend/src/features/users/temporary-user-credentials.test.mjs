import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../../pages/Users.tsx', import.meta.url), 'utf8')
const creation = readFileSync(new URL('./use-user-creation.ts', import.meta.url), 'utf8')
const dialog = readFileSync(new URL('./user-credentials-dialog.tsx', import.meta.url), 'utf8')
assert.match(page, /import \{ useUserCreation \} from '..\/features\/users\/use-user-creation'/)
assert.match(page, /useUserCreation\(\{ loadData, showApiError, setSaving \}\)/)
assert.match(page, /import \{ UserCredentialsDialog \} from '..\/features\/users\/user-credentials-dialog'/)
assert.match(page, /<UserCredentialsDialog\b[\s\S]*?createdCredentials=\{createdCredentials\}/)
const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)

test('admin user creation only displays the server-generated one-time password', () => {
  assert.match(creation, /const initialPassword = response\.data\?\.initialPassword/)
  assert.doesNotMatch(page + creation + dialog, /DEFAULT_INITIAL_PASSWORD|Init\d{4}!/)
  assert.match(creation, /setCreatedCredentials\(\{ username, initialPassword \}\)/)
  assert.match(dialog, /if \(!open\) setCreatedCredentials\(null\)/)
  for (const locale of locales) {
    assert.equal(typeof locale.users.credentials.unavailable, 'string')
  }
})
