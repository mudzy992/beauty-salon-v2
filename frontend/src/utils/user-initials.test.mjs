import assert from 'node:assert/strict'
import test from 'node:test'

import { userInitials } from './user-initials.mjs'

/**
 * Inicijali za avatar dugmad (2.5.3 — vidljivi tekst mora biti human-interpretable:
 * axe 4.14 jedan-char tekst proglasi "Unable to determine" → incomplete).
 *
 * Ovaj modul drži TAČNO 2 alfanumerička znaka na svakom izlazu.
 */

test('CI korisnička imena iz e2e/seed-a daju 2 znaka', () => {
  assert.equal(userInitials('ci_a11y_admin'), 'CA')
  assert.equal(userInitials('ci_a11y_stylist'), 'CA')
})

test('dva dijela (razmak) — početna slova oba', () => {
  assert.equal(userInitials('nejra bosančić'), 'NB')
  assert.equal(userInitials('E2E Admin'), 'EA')
})

test('jedna riječ — prva dva alfanumerička znaka', () => {
  assert.equal(userInitials('nejra'), 'NE')
  assert.equal(userInitials('nejra.bosančić'), 'NB')
  assert.equal(userInitials('a-b'), 'AB')
})

test('degenerisani ulaz — fallback, uvijek 2 znaka', () => {
  assert.equal(userInitials(''), 'AA')
  assert.equal(userInitials('   '), 'AA')
  assert.equal(userInitials(null), 'AA')
  assert.equal(userInitials(undefined), 'AA')
  assert.equal(userInitials('-_.'), 'AA')
  assert.equal(userInitials('a'), 'AA')
})

test('fallback parametar se poštuje', () => {
  assert.equal(userInitials('', 'S'), 'SA')
  assert.equal(userInitials('', 'UU'), 'UU')
})

test('izlaz je uvijek TAČNO 2 znaka, uppercase', () => {
  for (const sample of ['ci_a11y_admin', 'a', 'abc', 'nejra', 'x.y', '', 'E2E Admin', 'žn\u017e']) {
    const out = userInitials(sample)
    assert.equal(out.length, 2, `ulaz ${JSON.stringify(sample)}`)
    assert.equal(out, out.toUpperCase(), `ulaz ${JSON.stringify(sample)}`)
    assert.match(out, /[\p{L}\p{N}]{2}/u, `ulaz ${JSON.stringify(sample)}`)
  }
})
