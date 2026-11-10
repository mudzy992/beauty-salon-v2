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

  // ── Dodano jer su kriteriji bili ❌ bez ijednog mjerenja ────────────────────────
  // axe već radi s `wcag2a/2aa/21a/21aa/22aa` i javlja 0 violations na 32 rute — pa ova
  // pravila vjerovatno PROLAZE, samo nisu bila u izvještaju. Bez ovoga se nije moglo znati
  // da li je ❌ stvarno stanje ili zastarjela bilješka iz rane faze.
  { rule: 'list', criteria: ['1.3.1'], note: '<ul>/<ol> struktura' },
  { rule: 'listitem', criteria: ['1.3.1'], note: '<li> mora biti u listi' },
  { rule: 'definition-list', criteria: ['1.3.1'], note: '<dl> struktura' },
  { rule: 'dlitem', criteria: ['1.3.1'], note: '<dt>/<dd> moraju biti u <dl>' },
  { rule: 'th-has-data-cells', criteria: ['1.3.1'], note: 'zaglavlje tabele mora imati podatke' },
  { rule: 'td-headers-attr', criteria: ['1.3.1'], note: 'headers atribut mora postojati' },
  { rule: 'layout-table', criteria: ['1.3.1'], note: 'tabelarni raspored bez <th>' },
  { rule: 'bypass', criteria: ['2.4.1'], note: 'skip-link ili landmark za zaobilaženje' },
  { rule: 'document-title', criteria: ['2.4.2'], note: '<title> mora postojati i biti prazan' },
  { rule: 'page-has-heading-one', criteria: ['2.4.6'], note: 'stranica mora imati <h1>' },
  { rule: 'heading-order', criteria: ['2.4.6'], note: 'naslovi ne smiju preskakati nivoe' },
  { rule: 'identical-links-same-purpose', criteria: ['2.4.4'], note: 'AAA — isti link, ista svrha' },
  { rule: 'aria-valid-attr', criteria: ['4.1.2'], note: 'nepostojeći aria atribut' },
  { rule: 'aria-valid-attr-value', criteria: ['4.1.2'], note: 'neispravna vrijednost aria atributa' },
  { rule: 'aria-allowed-attr', criteria: ['4.1.2'], note: 'aria atribut nije dopušten na ulozi' },
  { rule: 'aria-required-attr', criteria: ['4.1.2'], note: 'ulozi nedostaje obavezan aria' },
  { rule: 'aria-required-children', criteria: ['4.1.2'], note: 'ulozi nedostaje obavezni dijete' },
  { rule: 'aria-required-parent', criteria: ['4.1.2'], note: 'uloga zahtijeva određenog pretka' },
  { rule: 'aria-hidden-focus', criteria: ['4.1.2'], note: 'fokusabilno unutar aria-hidden' },
  { rule: 'nested-interactive', criteria: ['4.1.2'], note: 'interaktivno unutar interaktivnog' },
  { rule: 'role-has-required-aria-attributes', criteria: ['4.1.2'], note: 'ulozi nedostaju aria svojstva' },
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
 * Koliko nepotpunih čvorova po pravilu se čuva. Bez granice bi jedna ruta s mnogo ikona
 * napunila zapis, a anotacija se ionako odsijeca (izmjereno: GitHub prekida poruku oko
 * 2000 znakova).
 */
export const MAX_INCOMPLETE_NODES_PER_RULE = 3

/**
 * Koje čvorove axe nije mogao presuditi, i zašto.
 *
 * Ovo je razlog zašto je 2.5.3 ostao ŽUT: brojač je govorio `incomplete 22/32`, ali ne i
 * ŠTA je nepotpuno. Bez ciljanog elementa se ne može razlikovati „treba čovjeka" od „axe
 * ne vidi tekst koji je tu", a nagađanje je upravo ono što ovaj repo izbjegava.
 *
 * @returns {{target: string, html: string, message: string}[]}
 */
export function describeIncompleteNodes(results, rule, limit = MAX_INCOMPLETE_NODES_PER_RULE) {
  const entry = (results?.incomplete ?? []).find((e) => e.id === rule)
  if (!entry) return []
  return (entry.nodes ?? []).slice(0, limit).map((n) => ({
    target: String(Array.isArray(n.target) ? n.target.join(' ') : (n.target ?? '')).slice(0, 120),
    html: String(n.html ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
    message: String(n.any?.[0]?.message ?? n.all?.[0]?.message ?? n.none?.[0]?.message ?? '').slice(0, 140),
  }))
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

  const incompleteNodes = {}
  for (const { rule } of TRACKED_RULES) {
    const samples = describeIncompleteNodes(results, rule)
    if (samples.length) incompleteNodes[rule] = samples
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
  writeFileSync(
    file,
    `${JSON.stringify({ project, route, rules: perRule, incompleteNodes }, null, 2)}\n`,
    'utf8',
  )
  return file
}

/** Sabere sve zapise iz direktorija u brojače po pravilu. */
export function aggregateCoverage(dir) {
  const totals = Object.fromEntries(
    TRACKED_RULES.map(({ rule }) => [
      rule,
      Object.fromEntries([
        ...STATUSES.map((s) => [s, 0]),
        ['routes', []],
        ['nodes', 0],
        ['incompleteNodes', []],
      ]),
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
      for (const sample of record.incompleteNodes?.[rule] ?? []) {
        totals[rule].incompleteNodes.push({ ...sample, route: record.route })
      }
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

/**
 * Kodira poruku za GitHub workflow komandu (`::notice::`).
 *
 * Komanda se završava na **sirovom** novom redu, pa višelinijska poruka bez kodiranja stiže
 * kao samo prvi red — izmjereno na runu `42876931983`: anotacija je nosila jedva
 * „axe pokrivenost — 32 ruta", a svih 17 redova o pravilima je izgubljeno. Redoslijed je
 * bitan: `%` se mora zamijeniti **prvi**, inače bi pokvario vlastite zamjene.
 */
export function encodeWorkflowMessage(text) {
  return String(text)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
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

/**
 * Zaseban tekst o NEPOTPUNIM čvorovima — ide u **svoju** anotaciju, ne u sažetak.
 *
 * Razlog je izmjeren, ne pretpostavljen: GitHub prekida poruku anotacije oko 2000 znakova,
 * pa bi dodatak sažetku bio istisnut (ili bi istisnuo njega). Odvojena anotacija ima
 * vlastiti limit.
 *
 * @returns {string} prazan string ako nijedno pravilo nije nepotpuno
 */
export function formatIncompleteDetails(agg) {
  const lines = []
  for (const { rule, criteria } of TRACKED_RULES) {
    const samples = agg.totals[rule]?.incompleteNodes ?? []
    if (!samples.length) continue
    lines.push(`${criteria.join('/')} ${rule} — ${samples.length} nepotpunih čvorova:`)
    for (const s of samples.slice(0, 6)) {
      lines.push(`  ${s.route} | ${s.target} | ${s.html} | ${s.message}`)
    }
  }
  return lines.join('\n')
}

/**
 * Najveća dužina poruke anotacije koju GitHub ne odsijeca.
 *
 * Izmjereno, ne nagađeno: anotacija koraka `axe` stigla je skraćena na ~2000 znakova, pa je
 * popis pravila bio odsječen. Uz 37 praćenih pravila sažetak ima ~4300 znakova i bez
 * dijeljenja bi se izgubila polovina izvještaja — tiho, jer anotacija i dalje izgleda uredno.
 */
export const MAX_ANNOTATION_MESSAGE_LENGTH = 1800

/**
 * Dijeli višelinijsku poruku na anotacije koje stanu u limit.
 *
 * Mjeri se dužina **kodirane** poruke, ne sirove: `%` → `%25` i novi red → `%0A` značajno
 * produžuju tekst, pa bi dijeljenje po sirovoj dužini i dalje prelazilo limit.
 *
 * @returns {string[]} barem jedan dio; prazan ulaz daje `['']`
 */
export function chunkWorkflowMessage(text, limit = MAX_ANNOTATION_MESSAGE_LENGTH) {
  const fits = (candidate) => encodeWorkflowMessage(candidate).length <= limit
  const chunks = []
  let current = ''
  for (const line of String(text).split('\n')) {
    const candidate = current ? `${current}\n${line}` : line
    if (current && !fits(candidate)) {
      chunks.push(current)
      current = line
    } else {
      current = candidate
    }
  }
  // Odbrana od jednog predugog reda: bez ovoga bi cijela poruka ostala u jednom dijelu i
  // bila odsječena — što je upravo problem koji ova funkcija rješava.
  const out = []
  for (const chunk of current ? [...chunks, current] : chunks) {
    if (fits(chunk)) {
      out.push(chunk)
      continue
    }
    let part = ''
    for (const char of chunk) {
      if (part && !fits(part + char)) {
        out.push(part)
        part = char
      } else {
        part += char
      }
    }
    if (part) out.push(part)
  }
  return out.length ? out : ['']
}
