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
 * @param {string[]} [input.stillFocusable] isti snapshot, ali uzet NA KRAJU prolaska.
 *   Fokusabilnost se može promijeniti tokom prolaska: Radix tablista je jedan tab-stop, pa
 *   njen kontejner ima `tabindex="0"` dok je fokus izvan grupe, a `-1` čim fokus uđe u nju.
 *   Bez ovoga bi mjera tražila element koji u tom trenutku više nije u tab nizu — lažni
 *   prekršaj (izmjereno na runu 42968367610: `/admin/finance` i `/admin/users`, oba na
 *   kontejneru tabliste). Presuđuje se samo o elementima fokusabilnim u OBA snimka.
 * @returns {{
 *   expectedCount: number,
 *   stableCount: number,
 *   becameUnfocusable: string[],
 *   reachedCount: number,
 *   unvisited: string[],
 *   stuckAt: string|null,
 *   cycleLength: number,
 *   orderMismatch: {index: number, expected: string, actual: string}|null,
 * }}
 */
export function analyzeTabTraversal({ expected = [], visited = [], stillFocusable } = {}) {
  const expectedAll = Array.isArray(expected) ? expected : []
  const visitedList = Array.isArray(visited) ? visited : []

  // Presuđuje se samo o elementima koji su fokusabilni i na početku i na kraju. S onima
  // koji su u međuvremenu ispali iz tab niza nema se šta presuditi: Tab ih legitimno
  // preskače. Broji se s multiplicitetom, kao i svugdje ovdje.
  const stillCounts = new Map()
  for (const label of Array.isArray(stillFocusable) ? stillFocusable : []) {
    stillCounts.set(label, (stillCounts.get(label) ?? 0) + 1)
  }
  const expectedList = []
  const becameUnfocusable = []
  if (Array.isArray(stillFocusable)) {
    for (const label of expectedAll) {
      const left = stillCounts.get(label) ?? 0
      if (left > 0) {
        stillCounts.set(label, left - 1)
        expectedList.push(label)
      } else {
        becameUnfocusable.push(label)
      }
    }
  } else {
    expectedList.push(...expectedAll)
  }

  // `null` = fokus nije na elementu (u pravom pregledniku to može biti adresna traka ili
  // okvir). Ne broji se kao posjet, ali i ne prekida niz — Tab se i dalje desio.
  const meaningful = visitedList.filter((label) => label !== null && label !== undefined)

  // ── 2.1.1: je li svaki fokusabilni element stvarno dostižan ────────────────
  // S MULTIPLICITETOM: oznaka nije nužno jedinstvena (dva dugmeta „Nazad" daju isti
  // string). Da se broji samo skup, jedan dosegnut „Nazad" bi prikrio onaj drugi koji
  // nije dosegnut — lažni prolaz. Ovako se svaka pojava posebno skida s duga.
  const reached = new Set(meaningful)
  const remaining = new Map()
  for (const label of expectedList) remaining.set(label, (remaining.get(label) ?? 0) + 1)
  for (const label of meaningful) {
    const left = remaining.get(label)
    if (left !== undefined && left > 0) remaining.set(label, left - 1)
  }
  const unvisited = []
  for (const [label, left] of remaining) {
    for (let i = 0; i < left; i += 1) unvisited.push(label)
  }

  // ── 2.1.2: zaglavljen fokus ───────────────────────────────────────────────
  // Namjerno USKO: `stuckAt` je element na kojem uzastopni Tab nije pomjerio fokus. To je
  // tvrda zamka i nema dvosmislenosti.
  //
  // Širi obrazac — krug koji se ponavlja a ne pokriva cijeli spisak — NIJE proglašen
  // zamkom, jer to nije isto: ako Tab slobodno kruži `a → c → a` a `b` je fokusabilan po
  // snapshotu, fokus nije zarobljen nego `b` nije dostižan. To je prekršaj 2.1.1 i već je
  // prijavljen kroz `unvisited`. Proglasiti to zamkom bio bi nalaz koji imenuje pogrešan
  // kriterij. `cycleLength` ostaje kao podatak da se to dvoje može razlikovati.
  // I ovdje vrijedi isto pravilo kao za redoslijed: dvije RAZLIČITE dugmadi mogu dati istu
  // oznaku (npr. više Radix switcheva `button.peer.inline-flex` bez teksta). Uzastopne iste
  // oznake tad znače da se fokus POMJERIO, samo se to iz oznake ne vidi — pa bi mjera
  // prijavila zamku koje nema. Presuđuje se samo po jedinstvenim oznakama.
  // Izmjereno na runu 42967538571: `/admin/loyalty`, `/admin/reservations/calendar`,
  // `/admin/finance` i `/stylist/workbook` pali su upravo na višestrukim oznakama.
  const occurrences = new Map()
  for (const label of expectedList) occurrences.set(label, (occurrences.get(label) ?? 0) + 1)
  let stuckAt = null
  for (let i = 1; i < meaningful.length; i += 1) {
    if (meaningful[i] !== meaningful[i - 1]) continue
    if (occurrences.get(meaningful[i]) !== 1) continue
    stuckAt = meaningful[i]
    break
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
  // Poredi se samo po JEDINSTVENIM oznakama. Kad se ista oznaka pojavljuje više puta u
  // DOM-u, iz niza oznaka se ne može zaključiti koji je od njih fokusiran, pa bi svako
  // poređenje bilo nagađanje — a nagađanje koje padne imenuje element koji nije uzrok.
  // Izmjereno na runu 42966480987: `/admin/loyalty` i `/admin/reservations/calendar`
  // javili su „redoslijed" upravo na višestrukim `button.inline-flex.items-center` bez
  // teksta, dok je `/admin/analytics` pao na jedinstvenim oznakama i taj nalaz ostaje.
  const uniqueExpected = expectedList.filter(
    (label) => occurrences.get(label) === 1 && reached.has(label),
  )
  const uniqueSet = new Set(uniqueExpected)
  const actualUnique = []
  for (const label of meaningful) {
    if (!uniqueSet.has(label) || actualUnique.includes(label)) continue
    actualUnique.push(label)
  }

  let orderMismatch = null
  const limit = Math.min(actualUnique.length, uniqueExpected.length)
  for (let i = 0; i < limit; i += 1) {
    if (actualUnique[i] !== uniqueExpected[i]) {
      orderMismatch = { index: i, expected: uniqueExpected[i], actual: actualUnique[i] }
      break
    }
  }

  return {
    expectedCount: expectedAll.length,
    stableCount: expectedList.length,
    becameUnfocusable,
    reachedCount: reached.size,
    unvisited,
    stuckAt,
    cycleLength,
    orderMismatch,
  }
}

/**
 * Gornja granica broja pritisaka Tab. Petlja u specu prekida čim se ciklus zatvori, pa se
 * ovaj broj dohvata samo kad nešto nije u redu.
 *
 * @param {number} expectedCount
 */
export function tabPressesFor(expectedCount) {
  // GORNJA GRANICA, ne tačan broj: spec petlju prekida čim se ciklus zatvori, pa se ovaj
  // broj troši samo kad nešto nije u redu. Triput veći od spiska jer jedan element može
  // potrošiti više pritisaka — native `<input type="date">` ima segmente dan/mjesec/godina
  // u zatvorenom shadow DOM-u i svaki segment troši po jedan Tab, a `document.activeElement`
  // ostaje isti. Izmjereno na runu 42967538571: s `expected + 1` pritisaka rep stranice
  // ostajao je neposjećen, pa je mjera javljala „Tab ne doseže" na elementima do kojih Tab
  // stvarno dolazi — uvijek na repu, odmah poslije polja s datumom.
  const base = Number.isFinite(expectedCount) ? expectedCount : 0
  return base * 3 + 10
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
  if (analysis.becameUnfocusable?.length) {
    parts.push(
      `van tab niza tokom prolaska ${analysis.becameUnfocusable.length}: ` +
        `${analysis.becameUnfocusable.slice(0, 2).join(' | ')}`,
    )
  }
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
