import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEGACY_STORAGE_KEY, MODE_STORAGE_KEY, readModePreference, resolveTheme, writeModePreference } from './theme-policy.mjs'

const storage = (entries = {}) => {
  const values = new Map(Object.entries(entries))
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('administrator controls skin; local mode wins only for Aurum', () => {
  for (const pref of [null, 'light', 'dark', 'classic', 'broken']) {
    assert.equal(resolveTheme('classic', 'dark', pref), 'classic')
  }
  assert.equal(resolveTheme('aurum', 'dark', null), 'aurum-dark')
  assert.equal(resolveTheme('aurum', 'dark', 'light'), 'aurum-light')
  assert.equal(resolveTheme('aurum', 'light', 'dark'), 'aurum-dark')
  assert.equal(resolveTheme('invalid', 'invalid', null), 'aurum-light')
})

test('legacy migration reads only mode; invalid storage cannot enable classic', () => {
  assert.equal(readModePreference(storage({ [LEGACY_STORAGE_KEY]: 'aurum-dark' })), 'dark')
  assert.equal(readModePreference(storage({ [LEGACY_STORAGE_KEY]: 'aurum-light' })), 'light')
  assert.equal(readModePreference(storage({ [LEGACY_STORAGE_KEY]: 'classic' })), null)
  assert.equal(readModePreference(storage({ [MODE_STORAGE_KEY]: 'invalid', [LEGACY_STORAGE_KEY]: 'aurum-dark' })), null)
  assert.equal(readModePreference({ getItem() { throw Error('blocked') } }), null)
})

test('new storage accepts only light or dark and tolerates blocked storage', () => {
  const s = storage()
  assert.equal(writeModePreference(s, 'dark'), true)
  assert.equal(readModePreference(s), 'dark')
  assert.equal(writeModePreference(s, 'classic'), false)
  assert.equal(readModePreference(s), 'dark')
  assert.equal(writeModePreference({ setItem() { throw Error('blocked') } }, 'light'), false)
})
