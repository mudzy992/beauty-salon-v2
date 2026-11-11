/**
 * Analiza stvarnog Tab-prolaska kroz stranicu — 2.1.1, 2.1.2 i 2.4.3.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * `MATRIX.md` drži 2.1.1 i 2.4.3 na 🟡 („u kodu, nije verifikovano u renderu"), a 2.1.2
 * na ✅ uz dokaz koji je **samo iz izvora** („Radix fokus trap"). Sve tri tvrdnje govore o
 * nečemu što se dešava kad korisnik pritisne Tab — dakle o nečemu što se može izmjeriti
 * u Chromiumu, koji u CI poslu `a11y-e2e` postoji.
 *
 * ── Šta ovo NE dokazuje (bez uljepšavanja) ───────────────────────────────────
 * 2.1.1 traži da sva **funkcionalnost** bude dostupna s tastature. Ova mjera polazi od
 * `focusableSnapshot()`, koji nabraja elemente koji SU fokusabilni. `<div onClick>` bez
 * `tabIndex` se u tom spisku uopće ne pojavljuje, pa ga ova mjera **ne može** uhvatiti —
 * njega hvataju `jsx-a11y` (postavljen na `error`) i axe. Ono što ova mjera stvarno
 * dokazuje je uže i tačno: nijedan fokusabilni element nije nedostižan, fokus se ne
 * zaglavljuje, i redoslijed kojim Tab obilazi elemente prati DOM redoslijed.
 *
 * ── Zašto analiza nije unutar `page.evaluate` ────────────────────────────────
 * Pritisak tastera je Playwright API, pa petlja mora biti u specu. Ali analiza
 * zabilježenog niza je čista logika i ovdje je izdvojena kao funkcija koju
 * `tab-traversal.test.mjs` stvarno izvršava — mjera napisana kao string unutar
 * `page.evaluate` bila bi netestiran kod.
 */

/**
 * Analizira niz koji je nastao uzastopnim pritiscima Tab.
 *
 * @param {object} input
 * @param {string[]} [input.expected] fokusabilni elementi u DOM redoslijedu
 *   (izlaz `focusableSnapshot()`)
 * @param {(string|null)[]} [input.visited] oznake fokusiranog elementa nakon svakog
 *   pritiska Tab, redom. `null` znači da fokus nije bio na elementu.
 * @returns {{
 *   expectedCount: number,
 *   reachedCount: number,
 *   unvisited: string[],
 *   stuckAt: string|null,
 *   cycleLength: number,
 *   orderMismatch: {index: number, expected: string, actual: string}|null,
 * }}
 */
export function analyzeTabTraversal({ expected = [], visited = [] } = {}) {
  const expectedList = Array.isArray(expected) ? expected : []
  const visitedList = Array.isArray(visited) ? visited : []

  // `null` = fokus nije na elementu (u pravom pregledniku to može biti adresna traka ili
  // okvir). Ne broji se kao posjet, ali i ne prekida niz — Tab se i dalje desio.
  const meaningful = visitedList.filter((label) => label !== null && label !== undefined)

  // ── 2.1.1: je li svaki fokusabilni element stvarno dostižan ────────────────
  const reached = new Set(meaningful)
  const unvisited = expectedList.filter((label) => !reached.has(label))

  // ── 2.1.2: zaglavljen fokus ───────────────────────────────────────────────
  // Namjerno USKO: `stuckAt` je element na kojem uzastopni Tab nije pomjerio fokus. To je
  // tvrda zamka i nema dvosmislenosti.
  //
  // Širi obrazac — krug koji se ponavlja a ne pokriva cijeli spisak — NIJE proglašen
  // zamkom, jer to nije isto: ako Tab slobodno kruži `a → c → a` a `b` je fokusabilan po
  // snapshotu, fokus nije zarobljen nego `b` nije dostižan. To je prekršaj 2.1.1 i već je
  // prijavljen kroz `unvisited`. Proglasiti to zamkom bio bi nalaz koji imenuje pogrešan
  // kriterij. `cycleLength` ostaje kao podatak da se to dvoje može razlikovati.
  let stuckAt = null
  for (let i = 1; i < meaningful.length; i += 1) {
    if (meaningful[i] === meaningful[i - 1]) {
      stuckAt = meaningful[i]
      break
    }
  }

  // Dužina prvog kruga: koliko različitih elemenata prije prvog ponavljanja.
  let cycleLength = 0
  const firstPass = new Set()
  for (const label of meaningful) {
    if (firstPass.has(label)) break
    firstPass.add(label)
    cycleLength += 1
  }

  // ── 2.4.3: redoslijed ─────────────────────────────────────────────────────
  // Poredi se DOM redoslijed s redoslijedom PRVIH posjeta. Pozitivni `tabindex` i
  // vizuelno preslagivanje bez preslagivanja DOM-a upravo ovdje isplivaju: fokus bi
  // išao redom koji ne prati značenje sadržaja.
  const firstVisits = []
  const alreadyListed = new Set()
  for (const label of meaningful) {
    if (alreadyListed.has(label)) continue
    alreadyListed.add(label)
    firstVisits.push(label)
  }
  const expectedOrder = expectedList.filter((label) => reached.has(label))
  let orderMismatch = null
  const limit = Math.min(firstVisits.length, expectedOrder.length)
  for (let i = 0; i < limit; i += 1) {
    if (firstVisits[i] !== expectedOrder[i]) {
      orderMismatch = { index: i, expected: expectedOrder[i], actual: firstVisits[i] }
      break
    }
  }

  return {
    expectedCount: expectedList.length,
    reachedCount: reached.size,
    unvisited,
    stuckAt,
    cycleLength,
    orderMismatch,
  }
}

/**
 * Koliko puta pritisnuti Tab.
 *
 * Jedan pritisak više od broja fokusabilnih elemenata: tek tad se vidi da fokus ciklira
 * nazad na početak umjesto da ostane zarobljen. Bez tog jednog dodatnog pritiska zamka na
 * posljednjem elementu ne bi bila vidljiva.
 *
 * @param {number} expectedCount
 */
export function tabPressesFor(expectedCount) {
  return (Number.isFinite(expectedCount) ? expectedCount : 0) + 1
}

/**
 * Jedan čitljiv red za CI anotaciju.
 *
 * Bez ovoga bi pad bio „2.4.3: orderMismatch" bez ijednog imena — a nalaz bez lokacije se
 * ne može ni potvrditi ni popraviti.
 */
export function describeTraversal(analysis) {
  const parts = [
    `focusabilnih ${analysis.expectedCount}`,
    `dostignutih ${analysis.reachedCount}`,
  ]
  if (analysis.unvisited.length) {
    parts.push(`nedostignuto ${analysis.unvisited.length}: ${analysis.unvisited.slice(0, 4).join(' | ')}`)
  }
  if (analysis.stuckAt) parts.push(`ZAGLAVLJENO na ${analysis.stuckAt} (Tab nije pomjerio fokus)`)
  if (analysis.cycleLength && analysis.cycleLength < analysis.expectedCount) {
    parts.push(`krug ${analysis.cycleLength} od ${analysis.expectedCount}`)
  }
  if (analysis.orderMismatch) {
    parts.push(
      `REDOSLIJED na #${analysis.orderMismatch.index}: očekivano ${analysis.orderMismatch.expected}, ` +
        `dobijeno ${analysis.orderMismatch.actual}`,
    )
  }
  return parts.join(' · ')
}
