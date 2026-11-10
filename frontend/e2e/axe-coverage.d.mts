/**
 * Deklaracije za `axe-coverage.mjs` — logika je u `.mjs` da je `axe-coverage.test.mjs`
 * može stvarno izvršiti nad fiksiranim axe izvještajima, umjesto da je prepisuje.
 */

/** Minimalni strukturni opis axe izvještaja (ne vuče tipove iz `axe-core`). */
export interface AxeLikeResults {
  passes?: { id: string }[]
  violations?: { id: string; nodes?: unknown[] }[]
  incomplete?: { id: string }[]
  inapplicable?: { id: string }[]
}

export interface TrackedRule {
  rule: string
  criteria: string[]
  note: string
}

export type CoverageStatus = 'passed' | 'violations' | 'incomplete' | 'inapplicable' | 'absent'

export interface RuleCounts {
  passed: number
  violations: number
  incomplete: number
  inapplicable: number
  absent: number
  routes: string[]
  nodes: number
}

export const TRACKED_RULES: TrackedRule[]
export const STATUSES: CoverageStatus[]

export function defaultCoverageDir(cwd?: string): string

export function coverageFileName(project: string, route: string): string

export function recordAxeCoverage(
  project: string,
  route: string,
  results: AxeLikeResults | undefined,
  dir: string,
): string

export function aggregateCoverage(dir: string): {
  totals: Record<string, RuleCounts>
  routeCount: number
}

export function verdictFor(counts: RuleCounts): 'PROLAZ' | 'NEPOTPUNO' | 'NIJE_SE_PRIMJENIO' | 'PAD'

export function formatCoverageSummary(agg: {
  totals: Record<string, RuleCounts>
  routeCount: number
}): string
