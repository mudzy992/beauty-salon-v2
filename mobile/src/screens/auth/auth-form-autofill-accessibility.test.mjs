import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const registration = readFileSync(new URL('./RegisterScreen.tsx', import.meta.url), 'utf8')
const login = readFileSync(new URL('./LoginScreen.tsx', import.meta.url), 'utf8')
const inputFields = (source) => [...source.matchAll(/<Input\b[\s\S]*?\/>/g)].map(([field]) => field)

test('registration fields provide appropriate name, account, contact, and new-password autofill hints', () => {
  const fields = inputFields(registration)
  assert.equal(fields.length, 7)

  for (const [field, marker, autoComplete, textContentType] of [
    [fields[0], "update('firstName'", 'name-given', 'givenName'],
    [fields[1], "update('lastName'", 'name-family', 'familyName'],
    [fields[2], "update('username'", 'username', 'username'],
    [fields[3], "update('email'", 'email', 'emailAddress'],
    [fields[4], "update('phone'", 'tel', 'telephoneNumber'],
    [fields[5], "update('password'", 'new-password', 'newPassword'],
    [fields[6], 'form.confirmPassword', 'new-password', 'newPassword'],
  ]) {
    assert.ok(field.includes(marker), `Unexpected registration field order for ${marker}`)
    assert.ok(field.includes(`autoComplete="${autoComplete}"`), `Missing ${autoComplete} hint`)
    assert.ok(field.includes(`textContentType="${textContentType}"`), `Missing ${textContentType} content type`)
  }
})

test('login identifier and password identify existing-account credentials to autofill services', () => {
  const fields = inputFields(login)
  assert.equal(fields.length, 2)
  assert.match(fields[0], /label=\{t\('auth\.loginOrUsername'\)\}/)
  assert.match(fields[0], /autoComplete="username"/)
  assert.match(fields[0], /textContentType="username"/)
  assert.match(fields[1], /label=\{t\('auth\.password'\)\}/)
  assert.match(fields[1], /autoComplete="current-password"/)
  assert.match(fields[1], /textContentType="password"/)
})
