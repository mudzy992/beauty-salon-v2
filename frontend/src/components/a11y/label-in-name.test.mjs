import assert from 'node:assert/strict'
import test from 'node:test'

import { labelWithVisibleText } from './label-in-name.mjs'

/**
 * 2.5.3 Label in Name.
 *
 * Testira čistu funkciju koju dijele admin omotač, javni omotač, stylist omotač i
 * registracija — prije nego što je izdvojena, svako mjesto je zasebno lijepilo string, pa
 * bi se jedno mjesto moglo popraviti a četiri ostati u prekršaju.
 */

test('vidljivi tekst koji nije u imenu se dodaje', () => {
  assert.equal(labelWithVisibleText('Admin meni', 'NJ'), 'Admin meni, NJ')
})

test('ime koje već sadrži vidljivi tekst ostaje netaknuto', () => {
  assert.equal(labelWithVisibleText('Admin meni za NJ', 'NJ'), 'Admin meni za NJ')
  assert.equal(labelWithVisibleText('Korisnički meni NJ', 'nj'), 'Korisnički meni NJ', 'veličina slova nije bitna')
})

test('prazan vidljivi tekst ne dodaje zarez', () => {
  assert.equal(labelWithVisibleText('Admin meni', ''), 'Admin meni')
  assert.equal(labelWithVisibleText('Admin meni', '   '), 'Admin meni')
  assert.equal(labelWithVisibleText('Admin meni', undefined), 'Admin meni')
})

test('prazno ime postaje vidljivi tekst, ne „, NJ"', () => {
  assert.equal(labelWithVisibleText('', 'NJ'), 'NJ')
  assert.equal(labelWithVisibleText(undefined, 'NJ'), 'NJ')
})

test('višestruki razmaci se sažimaju i na rubovima', () => {
  assert.equal(labelWithVisibleText('  Admin   meni ', '  NJ '), 'Admin meni, NJ')
  assert.equal(labelWithVisibleText('Admin  meni', 'N  J'), 'Admin meni, N J')
})
