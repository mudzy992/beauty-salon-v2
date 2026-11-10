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

/** Čvor koji axe nije mogao presuditi, uz rutu na kojoj je nađen. */
export type IncompleteNode = { target: string; html: string; message: string }
export type RoutedIncompleteNode = IncompleteNode & { route: string }

export interface RuleCounts {
  passed: number
  violations: number
  incomplete: number
  inapplicable: number
  absent: number
  routes: string[]
  nodes: number
  incompleteNodes: RoutedIncompleteNode[]
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

export function encodeWorkflowMessage(text: string): string

export function verdictFor(counts: RuleCounts): 'PROLAZ' | 'NEPOTPUNO' | 'NIJE_SE_PRIMJENIO' | 'PAD'

export function formatCoverageSummary(agg: {
  totals: Record<string, RuleCounts>
  routeCount: number
}): string

export const MAX_INCOMPLETE_NODES_PER_RULE: number

export function describeIncompleteNodes(
  results: unknown,
  rule: string,
  limit?: number,
): IncompleteNode[]

export function formatIncompleteDetails(agg: CoverageAggregate): string

export const MAX_ANNOTATION_MESSAGE_LENGTH: number

export function chunkWorkflowMessage(text: string, limit?: number): string[]
