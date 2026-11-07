import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ChangePasswordScreen.tsx', import.meta.url), 'utf8')

test('change-password fields expose current and new-password autofill semantics', () => {
  const fields = [...screen.matchAll(/<Input\b[\s\S]*?\/>/g)].map(([field]) => field)
  assert.equal(fields.length, 3)

  for (const [field, label, autoComplete, textContentType] of [
    [fields[0], 'currentPassword', 'current-password', 'password'],
    [fields[1], 'newPassword', 'new-password', 'newPassword'],
    [fields[2], 'confirmPassword', 'new-password', 'newPassword'],
  ]) {
    assert.ok(field.includes(`t('profile.changePassword.${label}')`), `Missing ${label} label`)
    assert.match(field, /secureTextEntry/)
    assert.ok(field.includes(`autoComplete="${autoComplete}"`), `Missing ${autoComplete} autofill hint`)
    assert.ok(field.includes(`textContentType="${textContentType}"`), `Missing ${textContentType} content type`)
  }
})
