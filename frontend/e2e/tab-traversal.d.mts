/**
 * Deklaracije za `tab-traversal.mjs` — logika je u `.mjs` da je `tab-traversal.test.mjs`
 * može stvarno izvršiti nad fiksiranim nizovima, umjesto da je prepisuje.
 */

/** Rezultat analize zabilježenog Tab-prolaska. */
export interface TabTraversalAnalysis {
  /** Koliko je fokusabilnih elemenata bilo u DOM-u na početku. */
  expectedCount: number
  /** Koliko ih je fokusabilno i na kraju — samo o njima se presuđuje. */
  stableCount: number
  /** Elementi koji su tokom prolaska ispali iz tab niza; nije prekršaj. */
  becameUnfocusable: string[]
  /** Elementi na kojima `focus()` ne zadrži fokus — nisu zasebni tab-stopovi, nije prekršaj. */
  notDistinctTabStops: string[]
  /** Koliko ih je Tab stvarno dohvatio. */
  reachedCount: number
  /** Fokusabilni, a nedostignuti — 2.1.1. */
  unvisited: string[]
  /** Element na kojem uzastopni Tab nije pomjerio fokus — 2.1.2; `null` ako ga nema. */
  stuckAt: string | null
  /** Dužina prvog kruga; manja od `expectedCount` znači da dio elemenata nije u krugu. */
  cycleLength: number
  /** Prvo mjesto gdje redoslijed posjeta odstupa od DOM redoslijeda — 2.4.3. */
  orderMismatch: { index: number; expected: string; actual: string } | null
}

export function analyzeTabTraversal(input?: {
  expected?: string[]
  visited?: (string | null)[]
  /** Isti snapshot na kraju prolaska — bez njega se presuđuje i o elementima koji su
   * u međuvremenu ispali iz tab niza. */
  stillFocusable?: string[]
  /** Oznake za koje je `probeFocusability` izmjerila da `focus()` NE zadrži fokus. */
  unfocusable?: string[]
}): TabTraversalAnalysis

/** Jedan pritisak više od broja elemenata, da se vidi cikliranje. */
export function tabPressesFor(expectedCount: number): number

/** Čitljiv red za CI anotaciju — imenuje elemente, ne samo brojeve. */
export function describeTraversal(analysis: TabTraversalAnalysis): string
