import assert from 'node:assert/strict'
import test from 'node:test'
import i18next from 'i18next'

import {
  APP_LOCALE_KEY,
  createI18nOptions,
  normalizeAppLanguage,
  persistAppLanguage,
  readAppLanguage,
} from './language.mjs'

const createMemoryStorage = (initialValue) => {
  const values = new Map()
  if (initialValue !== undefined) values.set(APP_LOCALE_KEY, initialValue)
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

test('normalizes supported language tags and falls back to Bosnian', () => {
  assert.equal(normalizeAppLanguage('bs'), 'bs')
  assert.equal(normalizeAppLanguage('en'), 'en')
  assert.equal(normalizeAppLanguage('EN-GB'), 'en')
  assert.equal(normalizeAppLanguage('en_US'), 'en')
  assert.equal(normalizeAppLanguage('fr-FR'), 'bs')
  assert.equal(normalizeAppLanguage(null), 'bs')
})

test('reads and persists the language preference in browser storage', () => {
  const storage = createMemoryStorage()
  assert.equal(readAppLanguage(storage), 'bs')
  assert.equal(readAppLanguage(createMemoryStorage('EN-GB')), 'en')
  assert.equal(readAppLanguage(createMemoryStorage('unsupported')), 'bs')

  assert.equal(persistAppLanguage('en', storage), 'en')
  assert.equal(storage.getItem(APP_LOCALE_KEY), 'en')
  assert.equal(persistAppLanguage('unsupported', storage), 'bs')
  assert.equal(storage.getItem(APP_LOCALE_KEY), 'bs')
})

test('continues with the in-memory default if browser storage is unavailable', () => {
  const blockedStorage = {
    getItem() {
      throw new Error('storage unavailable')
    },
    setItem() {
      throw new Error('storage unavailable')
    },
  }

  assert.equal(readAppLanguage(blockedStorage), 'bs')
  assert.equal(persistAppLanguage('en', blockedStorage), 'en')
  assert.equal(readAppLanguage(undefined), 'bs')
  assert.equal(persistAppLanguage('bs', undefined), 'bs')
})

test('i18next switches at runtime and falls back to the configured Bosnian resource', async () => {
  const resources = {
    bs: { translation: { shell: { fallbackOnly: 'Bosanski fallback', greeting: 'Zdravo' } } },
    en: { translation: { shell: { greeting: 'Hello' } } },
  }
  const instance = i18next.createInstance()
  await instance.init(createI18nOptions('en-GB', resources))

  assert.equal(instance.language, 'en')
  assert.equal(instance.t('shell.greeting'), 'Hello')
  assert.equal(instance.t('shell.fallbackOnly'), 'Bosanski fallback')
  assert.equal(instance.t('shell.missingKey'), 'shell.missingKey')

  await instance.changeLanguage('bs')
  assert.equal(instance.t('shell.greeting'), 'Zdravo')
})
