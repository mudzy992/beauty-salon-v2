import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Koja axe pravila dokazuju koji WCAG kriterij — i obrnuto, šta NE dokazuju.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * `MATRIX.md` drži 23 kriterija na 🟡 („zadovoljeno u kodu, nije verificirano u renderu").
 * Od kad CI posao `a11y-e2e` pokreće pravi Chromium, dio tih kriterija **ima** rendered
 * dokaz — ali samo onaj koji se vidi iz ishoda suite-a: „0 failed" kaže da nijedno pravilo
 * nije palo, ne i da se ijedno **primijenilo**. Axe pravilo može biti i `inapplicable`
 * (nema takvih čvorova na stranici) ili `incomplete` (treba raspored/AT), a to su dvije
 * sasvim različite tvrdnje od „prošlo".
 *
 * Zato se ovdje bilježi **status svakog praćenog pravila po ruti**, pa se kriterij smije
 * pomjeriti na ✅ samo ako je pravilo stvarno prošlo, a ne samo izostalo.
 *
 * ── Šta ovo NE pokriva ───────────────────────────────────────────────────────
 * Kriteriji bez axe pravila (1.3.2, 1.3.3, 1.3.4, 1.4.5, 1.4.12, 2.3.1, 2.3.3, 2.4.5,
 * 2.5.1, 2.5.2, 2.5.4, 3.2.1, 3.2.2, 3.3.1, 3.3.3, 3.3.8) ostaju 🟡 i dalje — za njih
 * treba čitač ekrana ili ručna provjera (M1–M13).
 */
export const TRACKED_RULES = [
  { rule: 'image-alt', criteria: ['1.1.1'], note: '<img> bez alt' },
  { rule: 'role-img-alt', criteria: ['1.1.1'], note: 'role="img" bez imena' },
  { rule: 'svg-img-alt', criteria: ['1.1.1'], note: 'SVG bez pristupačnog imena' },
  { rule: 'input-image-alt', criteria: ['1.1.1'], note: 'input type="image" bez alt' },
  { rule: 'area-alt', criteria: ['1.1.1'], note: '<area> bez alt' },
  { rule: 'link-name', criteria: ['1.1.1', '4.1.2'], note: 'link bez imena' },
  { rule: 'button-name', criteria: ['1.1.1', '4.1.2'], note: 'dugme bez imena' },
  { rule: 'frame-title', criteria: ['1.1.1', '4.1.2'], note: 'iframe bez naslova' },
  { rule: 'object-alt', criteria: ['1.1.1'], note: '<object> bez alternative' },
  { rule: 'color-contrast', criteria: ['1.4.3'], note: 'kontrast teksta (treba raspored)' },
  { rule: 'meta-viewport', criteria: ['1.4.4'], note: 'samo user-scalable/maximum-scale, NE zumiranje' },
  { rule: 'scrollable-region-focusable', criteria: ['2.1.1'], note: 'samo skrolabilne regije, NE cijela tastatura' },
  { rule: 'label-content-name-mismatch', criteria: ['2.5.3'], note: 'vidljivi tekst mora biti u imenu' },
  { rule: 'target-size', criteria: ['2.5.8'], note: 'meta min. 24×24 CSS px (WCAG 2.2)' },
  { rule: 'label', criteria: ['3.3.2'], note: 'samo prisustvo labele, NE i uputstva' },
  { rule: 'select-name', criteria: ['3.3.2'], note: '<select> bez imena' },
  { rule: 'form-field-multiple-labels', criteria: ['3.3.2'], note: 'više labeta za jedno polje' },
]

/** Axe statusi koje pratimo. `absent` = pravilo se uopšte nije našlo u izvještaju. */
export const STATUSES = ['passed', 'violations', 'incomplete', 'inapplicable', 'absent']

/**
 * Direktorij zapisa. `process.cwd()` jer Playwright uvijek radi iz `frontend/`, a u ESM-u
 * (`package.json` ima `"type": "module"`) `__dirname` ne postoji.
 * Putanja je pod `test-results/`, koji je u `.gitignore`.
 */
export function defaultCoverageDir(cwd = process.cwd()) {
  return join(cwd, 'test-results', 'axe-coverage')
}

/** Ime fajla za jednu rutu: bez ovoga bi naslovi s `/` i razmacima pravili poddirektorije. */
export function coverageFileName(project, route) {
  const slug = String(route).replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()
  return `${String(project).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}__${slug || 'root'}.json`
}

/**
 * Axe u izvještaju koristi `passes` (množina), dok je interno ime statusa `passed`. Bez ovog
 * mapiranja bi se čitao nepostojeći ključ i **svako** pravilo bi završilo kao `absent` —
 * tiha greška koju je uhvatio `axe-coverage.test.mjs`.
 */
const AXE_REPORT_KEYS = {
  passed: 'passes',
  violations: 'violations',
  incomplete: 'incomplete',
  inapplicable: 'inapplicable',
}

/**
 * Zapiše status svakog praćenog pravila za jednu rutu. Jedan fajl po testu jer
 * `playwright.config.ts` ima `fullyParallel: true` — dijeljeni fajl bi se prepisivao.
 */
export function recordAxeCoverage(project, route, results, dir) {
  const buckets = new Map(STATUSES.map((status) => [status, new Set()]))
  for (const status of Object.keys(AXE_REPORT_KEYS)) {
    for (const entry of results?.[AXE_REPORT_KEYS[status]] ?? []) buckets.get(status).add(entry.id)
  }

  const perRule = {}
  for (const { rule } of TRACKED_RULES) {
    let status = 'absent'
    for (const candidate of ['violations', 'incomplete', 'passed', 'inapplicable']) {
      if (buckets.get(candidate).has(rule)) {
        status = candidate
        break
      }
    }
    const nodes = (results?.violations ?? []).find((v) => v.id === rule)?.nodes?.length ?? 0
    perRule[rule] = { status, nodes }
  }

  mkdirSync(dir, { recursive: true })
  const file = join(dir, coverageFileName(project, route))
  writeFileSync(file, `${JSON.stringify({ project, route, rules: perRule }, null, 2)}\n`, 'utf8')
  return file
}

/** Sabere sve zapise iz direktorija u brojače po pravilu. */
export function aggregateCoverage(dir) {
  const totals = Object.fromEntries(
    TRACKED_RULES.map(({ rule }) => [
      rule,
      Object.fromEntries([...STATUSES.map((s) => [s, 0]), ['routes', []], ['nodes', 0]]),
    ]),
  )

  let files = []
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  } catch {
    return { totals, routeCount: 0 }
  }

  for (const name of files.sort()) {
    const record = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    for (const { rule } of TRACKED_RULES) {
      const entry = record.rules?.[rule]
      if (!entry) continue
      totals[rule][entry.status] += 1
      totals[rule].nodes += entry.nodes ?? 0
      // `absent` se namjerno NE upisuje u trag: bio bi na svakoj od 38 ruta za svako pravilo
      // koje tu ne postoji, pa bi trag bio beskoristan. Broji se i dalje u `absent`.
      if (entry.status !== 'absent') totals[rule].routes.push(`${record.route}:${entry.status}`)
    }
  }
  return { totals, routeCount: files.length }
}

/**
 * Presuda za jedan kriterij: ✅ smije biti samo ako je pravilo stvarno prošlo i nigdje
 * nije ostalo nepotpuno. „Nije se primijenilo" NIJE prolaz — to je prazna stranica.
 */
export function verdictFor(counts) {
  if (counts.violations > 0) return 'PAD'
  if (counts.incomplete > 0) return 'NEPOTPUNO'
  if (counts.passed === 0) return 'NIJE_SE_PRIMJENIO'
  return 'PROLAZ'
}

/** Kompaktan sažetak za CI anotaciju (log i artefakt se ne daju dohvatiti). */
export function formatCoverageSummary(agg) {
  const byCriterion = new Map()
  for (const { rule, criteria, note } of TRACKED_RULES) {
    for (const criterion of criteria) {
      if (!byCriterion.has(criterion)) byCriterion.set(criterion, [])
      byCriterion.get(criterion).push({ rule, note, counts: agg.totals[rule] })
    }
  }

  const lines = [`axe pokrivenost — ${agg.routeCount} ruta`]
  for (const criterion of [...byCriterion.keys()].sort()) {
    for (const { rule, counts } of byCriterion.get(criterion)) {
      lines.push(
        `  ${criterion} ${rule}: ${verdictFor(counts)} ` +
          `(passed ${counts.passed}, incomplete ${counts.incomplete}, ` +
          `inapplicable ${counts.inapplicable}, violations ${counts.violations}, absent ${counts.absent})`,
      )
    }
  }
  return lines.join('\n')
}
