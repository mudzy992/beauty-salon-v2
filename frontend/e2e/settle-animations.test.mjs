import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import { ANIMATION_SETTLE_TIMEOUT_MS, animationSettler } from './settle-animations.mjs'

const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')

/**
 * Testira stvarnu funkciju koja se šalje u preglednik. Bez ovoga bi „čekanje animacija"
 * bilo netestiran kod koji se prvi put izvrši u CI — upravo zamka koja je već dovela do
 * pada na svim rutama odjednom.
 */

function withAnimations(value) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>')
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  if (value === undefined) delete dom.window.document.getAnimations
  else dom.window.document.getAnimations = () => value
  return dom.window.document
}

const fake = (settles = true) => ({
  finished: settles ? Promise.resolve() : Promise.reject(new Error('otkazana')),
})

test('animationSettler čeka završetak i vraća broj viđenih animacija', async () => {
  withAnimations([fake(), fake(), fake()])
  assert.equal(await animationSettler(), 3, 'bez broja se ne zna da li je išta i nađeno')
})

test('animationSettler — otkazana animacija ne ruši čekanje', async () => {
  withAnimations([fake(), fake(false)])
  assert.equal(await animationSettler(), 2)
})

test('animationSettler — podnosi nedostatak getAnimations i praznu listu', async () => {
  withAnimations(undefined)
  assert.equal(await animationSettler(), 0, 'stariji preglednik bez API-ja ne smije pasti')
  withAnimations([])
  assert.equal(await animationSettler(), 0)
})

test('animationSettler — podnosi animaciju bez `finished`', async () => {
  withAnimations([{}, fake()])
  assert.equal(await animationSettler(), 2)
})

test('vremenska granica je konačna i veća od trajanja logo animacije', () => {
  // `app-logo-reveal` je 700ms + 40ms kašnjenja; granica mora biti iznad toga, ali ne
  // beskonačna — inače bi se test vješao umjesto da nastavi.
  assert.ok(ANIMATION_SETTLE_TIMEOUT_MS > 740, 'mora pokriti najdužu animaciju')
  assert.ok(ANIMATION_SETTLE_TIMEOUT_MS <= 10000, 'ne smije biti beskonačno')
})
