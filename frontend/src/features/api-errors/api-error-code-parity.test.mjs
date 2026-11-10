import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { API_ERROR_CODE_TO_KEY, resolveApiErrorCodeKey } from './api-error-code-map.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
// frontend/src/features/api-errors -> korijen repoa
const ROOT = resolve(HERE, '..', '..', '..', '..')
const REGISTRY = resolve(ROOT, 'backend/src/common/errors/api-error-codes.ts')
const BS_LOCALE = resolve(HERE, '..', '..', 'i18n/locales/bs.json')
const EN_LOCALE = resolve(HERE, '..', '..', 'i18n/locales/en.json')

/** `KOD: 'poruka',` unutar `API_ERROR_CODES = { … } as const`. */
const ENTRY = /^ {2}([A-Z][A-Z0-9_]*): '((?:[^'\\]|\\.)*)',$/gm

/** Backend registar -> Map(kod -> poruka). Baca ako se oblik registra promijeni. */
const readRegistry = () => {
  const src = readFileSync(REGISTRY, 'utf8')
  const start = src.indexOf('export const API_ERROR_CODES = {')
  assert.notEqual(start, -1, 'API_ERROR_CODES blok nije pronađen u backend registru')
  const end = src.indexOf('} as const;', start)
  assert.notEqual(end, -1, 'backend registar nema zatvaranje `} as const;`')
  const entries = new Map()
  for (const [, code, message] of src.slice(start, end).matchAll(ENTRY)) {
    assert.ok(!entries.has(code), `backend registar ima dupliran kod ${code}`)
    entries.set(code, message)
  }
  return entries
}

const leafValue = (resource, key) =>
  key.split('.').reduce((value, part) => (value == null ? value : value[part]), resource)

const registry = readRegistry()
const backendCodes = [...registry.keys()]
const frontendCodes = Object.keys(API_ERROR_CODE_TO_KEY)

test('backend registar gresaka i frontend mapa imaju isti skup kodova (1:1)', () => {
  // Pozitivna kontrola: prazan registar bi trivijalno prosao parnost.
  assert.ok(backendCodes.length >= 100, `očekivano >=100 kodova, dobijeno ${backendCodes.length}`)
  assert.deepEqual(
    [...frontendCodes].sort(),
    [...backendCodes].sort(),
    'frontend API_ERROR_CODE_TO_KEY i backend API_ERROR_CODES moraju imati identičan skup kodova',
  )
})

test('svaki kod u mapi se razrješava u i18n ključ koji postoji u oba jezika', () => {
  const bs = JSON.parse(readFileSync(BS_LOCALE, 'utf8'))
  const en = JSON.parse(readFileSync(EN_LOCALE, 'utf8'))
  const missingBs = []
  const missingEn = []
  for (const code of frontendCodes) {
    const key = API_ERROR_CODE_TO_KEY[code]
    assert.equal(typeof key, 'string', `${code} nema i18n ključ`)
    assert.ok(key.includes('.'), `${code} -> '${key}' nije tačkasti i18n ključ`)
    if (leafValue(bs, key) === undefined) missingBs.push(`${code} -> ${key}`)
    if (leafValue(en, key) === undefined) missingEn.push(`${code} -> ${key}`)
  }
  assert.deepEqual(missingBs, [], 'ključevi nedostaju u bs.json')
  assert.deepEqual(missingEn, [], 'ključevi nedostaju u en.json')
})

test('backend poruke su jedinstvene: jedan kod ne dijeli tekst s drugim kodom', async () => {
  const seen = new Map()
  const duplicates = []
  for (const [code, message] of registry) {
    if (seen.has(message)) duplicates.push(`${code} == ${seen.get(message)} ('${message}')`)
    else seen.set(message, code)
  }
  assert.deepEqual(duplicates, [], 'dvije poruke dijele isti tekst, pa prijevod po kodu gubi smisao')
})

test('resolveApiErrorCodeKey prihvata samo poznate kodove', () => {
  assert.equal(resolveApiErrorCodeKey('USERS_NOT_FOUND'), 'users.errors.notFound')
  // Nepoznat / neispravan kod -> undefined, da pozivatelj padne na tekst poruke.
  assert.equal(resolveApiErrorCodeKey('NE_POSTOJI_OVAJ_KOD'), undefined)
  assert.equal(resolveApiErrorCodeKey(undefined), undefined)
  assert.equal(resolveApiErrorCodeKey('users.errors.notFound'), undefined)
})

test('svaki poziv apiError() u backendu koristi kod iz registra', () => {
  const callSites = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      const full = resolve(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.ts$/.test(entry.name) && !full.endsWith('api-error-codes.ts')) {
        const src = readFileSync(full, 'utf8')
        for (const [, code] of src.matchAll(/apiError\('([A-Z][A-Z0-9_]*)'\)/g)) {
          callSites.push([full, code])
        }
      }
    }
  }
  walk(resolve(ROOT, 'backend/src'))
  assert.ok(callSites.length >= 250, `očekivano >=250 poziva apiError(), dobijeno ${callSites.length}`)
  const unknown = callSites.filter(([, code]) => !registry.has(code))
  assert.deepEqual(
    unknown.map(([f, c]) => `${f.replace(ROOT + '/', '')}: ${c}`),
    [],
    'apiError() pozvan s kodom koji nije u registru',
  )
})
