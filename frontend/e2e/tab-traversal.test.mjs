import assert from 'node:assert/strict'
import test from 'node:test'

import { analyzeTabTraversal, describeTraversal, tabPressesFor } from './tab-traversal.mjs'

/**
 * Tab-prolazak: 2.1.1 (dostižnost), 2.1.2 (zamka), 2.4.3 (redoslijed).
 *
 * Nizovi su onakvi kakve ih spec stvarno zabilježi: po jedna oznaka fokusiranog elementa
 * nakon svakog pritiska Tab.
 */

test('čist prolazak: sve dostižno, bez zamke, redoslijed prati DOM', () => {
  const out = analyzeTabTraversal({
    expected: ['a', 'b', 'c'],
    // posljednji `a` je cikliranje nazad na početak — to je normalno, ne zamka
    visited: ['a', 'b', 'c', 'a'],
  })
  assert.equal(out.expectedCount, 3)
  assert.equal(out.reachedCount, 3)
  assert.deepEqual(out.unvisited, [])
  assert.equal(out.stuckAt, null)
  assert.equal(out.orderMismatch, null)
  assert.equal(out.cycleLength, 3)
})

test('2.1.2: uzastopni Tab koji ne pomjeri fokus je zamka', () => {
  const out = analyzeTabTraversal({
    expected: ['a', 'b', 'c'],
    visited: ['a', 'a', 'a', 'a'],
  })
  assert.equal(out.stuckAt, 'a', 'mora imenovati element na kojem je fokus zaglavljen')
  assert.equal(out.cycleLength, 1, 'krug od jednog elementa')
})

test('2.1.1 nedostignut element NIJE proglašen zamkom', () => {
  // `b` je fokusabilan po snapshotu ali ga Tab nikad ne dohvati. Fokus slobodno kruži
  // a → c → a, dakle NIJE zarobljen: ovo je prekršaj 2.1.1, ne 2.1.2. Mjera mora ta dva
  // razlikovati, jer nalaz koji imenuje pogrešan kriterij odvodi u pogrešnom smjeru.
  const out = analyzeTabTraversal({
    expected: ['a', 'b', 'c'],
    visited: ['a', 'c', 'a', 'c'],
  })
  assert.deepEqual(out.unvisited, ['b'])
  assert.equal(out.stuckAt, null, 'nema zamke — fokus se pomjera')
  assert.equal(out.cycleLength, 2, 'krug je kraći od spiska, što je podatak a ne presuda')
})

test('2.4.3: redoslijed koji ne prati DOM se imenuje po indeksu', () => {
  const out = analyzeTabTraversal({
    expected: ['a', 'b', 'c'],
    visited: ['c', 'a', 'b', 'c'],
  })
  assert.deepEqual(out.orderMismatch, { index: 0, expected: 'a', actual: 'c' })
  assert.deepEqual(out.unvisited, [], 'svi su dostižni — problem je samo redoslijed')
  assert.equal(out.stuckAt, null)
})

test('2.4.3: poredi se DOM redoslijed s redoslijedom PRVIH posjeta', () => {
  // Drugi i treći pritisak samo ponavljaju ciklus; ne smiju uticati na poređenje.
  const out = analyzeTabTraversal({
    expected: ['a', 'b'],
    visited: ['a', 'b', 'b', 'a', 'b'],
  })
  assert.equal(out.orderMismatch, null)
})

test('`null` (fokus nije na elementu) se ne broji kao posjet ni kao zamka', () => {
  const out = analyzeTabTraversal({
    expected: ['a', 'b'],
    visited: ['a', null, 'b', null, 'a'],
  })
  assert.deepEqual(out.unvisited, [])
  assert.equal(out.stuckAt, null, 'null između istog elementa nije uzastopno ponavljanje')
  assert.equal(out.orderMismatch, null)
})

test('prazan i nepotpun ulaz ne pada', () => {
  const empty = analyzeTabTraversal()
  assert.equal(empty.expectedCount, 0)
  assert.deepEqual(empty.unvisited, [])
  assert.equal(empty.stuckAt, null)
  assert.equal(empty.orderMismatch, null)

  const noVisited = analyzeTabTraversal({ expected: ['a'] })
  assert.deepEqual(noVisited.unvisited, ['a'], 'bez ijednog pritiska ništa nije dostignuto')

  const junk = analyzeTabTraversal({ expected: null, visited: undefined })
  assert.equal(junk.expectedCount, 0)
})

test('tabPressesFor daje jedan pritisak više od broja elemenata', () => {
  // Tek taj dodatni pritisak pokazuje da fokus ciklira nazad umjesto da ostane zarobljen.
  assert.equal(tabPressesFor(3), 4)
  assert.equal(tabPressesFor(0), 1)
  assert.equal(tabPressesFor(NaN), 1, 'NaN ne smije proizvesti NaN petlju')
  assert.equal(tabPressesFor(undefined), 1)
})

test('describeTraversal imenuje elemente, ne samo brojeve', () => {
  const stuck = describeTraversal(
    analyzeTabTraversal({ expected: ['a', 'b'], visited: ['a', 'a'] }),
  )
  assert.match(stuck, /ZAGLAVLJENO na a/, 'mora imenovati element')

  const unreachable = describeTraversal(
    analyzeTabTraversal({ expected: ['a', 'b', 'c'], visited: ['a', 'c', 'a'] }),
  )
  assert.match(unreachable, /nedostignuto 1: b/, 'mora imenovati nedostignuti element')
  assert.match(unreachable, /krug 2 od 3/, 'mora pokazati da je krug kraći od spiska')

  const mismatch = describeTraversal(
    analyzeTabTraversal({ expected: ['a', 'b'], visited: ['b', 'a'] }),
  )
  assert.match(mismatch, /REDOSLIJED na #0/, 'mora pokazati indeks')
  assert.match(mismatch, /očekivano a/, 'mora imenovati očekivano')
  assert.match(mismatch, /dobijeno b/, 'mora imenovati dobijeno')

  const clean = describeTraversal(
    analyzeTabTraversal({ expected: ['a', 'b'], visited: ['a', 'b', 'a'] }),
  )
  assert.doesNotMatch(clean, /ZAGLAVLJENO|nedostignuto|REDOSLIJED|krug/)
})
