import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { readFileSync as readFile } from 'node:fs'
import {
  MAX_ANNOTATION_MESSAGE_LENGTH,
  MAX_INCOMPLETE_NODES_PER_RULE,
  TRACKED_RULES,
  AXE_RULE_TAGS,
  WCAG_TAGS,
  aggregateCoverage,
  assertableViolations,
  chunkWorkflowMessage,
  coverageFileName,
  describeIncompleteNodes,
  describeViolationNodes,
  encodeWorkflowMessage,
  formatCoverageSummary,
  formatIncompleteDetails,
  formatViolationDetails,
  recordAxeCoverage,
  verdictFor,
} from './axe-coverage.mjs'

/**
 * Bilježenje axe pokrivenosti po pravilima.
 *
 * Test izvršava **stvarni** `axe-coverage.mjs` nad fiksiranim axe izvještajima — logika je
 * zato u `.mjs`, a ne u `.ts`. Ključna stvar koju ovo čuva: „0 failed" u CI-ju ne znači da
 * je pravilo prošlo. Može biti `inapplicable` (nema takvih čvorova) ili `incomplete`
 * (treba raspored/AT), a `verdictFor` te tri tvrdnje razdvaja. Bez toga bi se kriterij
 * mogao proglasiti ✅ na osnovu prazne stranice.
 */

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'axe-cov-'))
}

/** axe izvještaj kakav vraća `AxeBuilder.analyze()`, samo s poljima koja ovdje trebaju. */
function axeReport({ passed = [], violations = [], incomplete = [], inapplicable = [] }) {
  return {
    passes: passed.map((id) => ({ id })),
    violations: violations.map((id) => ({ id, nodes: [{}, {}] })),
    incomplete: incomplete.map((id) => ({ id })),
    inapplicable: inapplicable.map((id) => ({ id })),
  }
}

test('svako praćeno pravilo ima barem jedan WCAG kriterij i opis šta NE dokazuje', () => {
  assert.ok(TRACKED_RULES.length >= 10)
  for (const entry of TRACKED_RULES) {
    assert.match(entry.rule, /^[a-z0-9-]+$/)
    assert.ok(entry.criteria.length >= 1, `${entry.rule} nema kriterij`)
    for (const criterion of entry.criteria) assert.match(criterion, /^\d\.\d+\.\d+$/)
    assert.ok(entry.note.length > 3, `${entry.rule} nema opis`)
  }
  const ids = TRACKED_RULES.map((r) => r.rule)
  assert.equal(new Set(ids).size, ids.length, 'pravila se ne smiju ponavljati')
})

test('coverageFileName sateruje rutu u jedan fajl, bez poddirektorija', () => {
  assert.equal(coverageFileName('admin', '/admin/reservations/calendar'), 'admin__admin-reservations-calendar.json')
  assert.equal(coverageFileName('chromium', '/'), 'chromium__root.json')
  assert.equal(coverageFileName('stylist', '/stylist/inbox'), 'stylist__stylist-inbox.json')
  for (const name of [
    coverageFileName('admin', '/a/b'),
    coverageFileName('chromium', '/'),
  ]) {
    assert.equal(name.includes('/'), false, 'ime fajla ne smije sadržavati /')
    assert.equal(name.startsWith('-'), false)
  }
})

test('recordAxeCoverage upisuje status po pravilu, a nespomenuto pravilo je absent', () => {
  const dir = tempDir()
  const file = recordAxeCoverage(
    'admin',
    '/admin/settings',
    axeReport({
      passed: ['label-content-name-mismatch', 'label', 'button-name'],
      violations: ['color-contrast'],
      incomplete: ['target-size'],
      inapplicable: ['svg-img-alt'],
    }),
    dir,
  )

  const record = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(record.route, '/admin/settings')
  assert.equal(record.rules['label-content-name-mismatch'].status, 'passed')
  assert.equal(record.rules['color-contrast'].status, 'violations')
  assert.equal(record.rules['color-contrast'].nodes, 2)
  assert.equal(record.rules['target-size'].status, 'incomplete')
  assert.equal(record.rules['svg-img-alt'].status, 'inapplicable')
  // Pravilo kojeg nema ni u jednoj listi — npr. frame-title na stranici bez iframe-a.
  assert.equal(record.rules['frame-title'].status, 'absent')
  rmSync(dir, { recursive: true, force: true })
})

test('prekršaj ima prednost nad prolazom — isto pravilo ne može biti i PAD i PROLAZ', () => {
  const dir = tempDir()
  const file = recordAxeCoverage(
    'chromium',
    '/',
    axeReport({ passed: ['color-contrast'], violations: ['color-contrast'] }),
    dir,
  )
  const record = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(record.rules['color-contrast'].status, 'violations')
  rmSync(dir, { recursive: true, force: true })
})

test('aggregateCoverage sabira preko ruta i broji ih', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/settings', axeReport({ passed: ['color-contrast'] }), dir)
  recordAxeCoverage('admin', '/admin/salon', axeReport({ incomplete: ['color-contrast'] }), dir)
  recordAxeCoverage('chromium', '/', axeReport({ violations: ['color-contrast'] }), dir)
  recordAxeCoverage('stylist', '/stylist/inbox', axeReport({}), dir)

  const agg = aggregateCoverage(dir)
  assert.equal(agg.routeCount, 4)
  assert.equal(agg.totals['color-contrast'].passed, 1)
  assert.equal(agg.totals['color-contrast'].incomplete, 1)
  assert.equal(agg.totals['color-contrast'].violations, 1)
  assert.equal(agg.totals['color-contrast'].routes.length, 3, 'trag broji samo rute gdje se pravilo javilo')
  assert.equal(
    agg.totals['color-contrast'].routes.some((r) => r.endsWith(':absent')),
    false,
    'absent ne ide u trag — bio bi na svakoj ruti',
  )
  assert.equal(agg.totals['label'].absent, 4, 'pravilo koje se nigdje nije javilo je absent na svakoj ruti')
  rmSync(dir, { recursive: true, force: true })
})

test('aggregateCoverage nad nepostojećim direktorijem ne pada i javlja 0 ruta', () => {
  const agg = aggregateCoverage(join(tmpdir(), 'sigurno-ne-postoji-axe-cov'))
  assert.equal(agg.routeCount, 0)
  assert.equal(agg.totals['color-contrast'].passed, 0)
})

test('verdictFor razdvaja prolaz, nepotpuno, neprimijenjeno i pad', () => {
  const base = { passed: 0, violations: 0, incomplete: 0, inapplicable: 0, absent: 0, routes: [], nodes: 0 }
  assert.equal(verdictFor({ ...base, passed: 5 }), 'PROLAZ')
  assert.equal(verdictFor({ ...base, passed: 5, violations: 1 }), 'PAD')
  assert.equal(verdictFor({ ...base, passed: 5, incomplete: 1 }), 'NEPOTPUNO')
  // Ključno: inapplicable/absent svuda NIJE prolaz — stranica jednostavno nema takvih čvorova.
  assert.equal(verdictFor({ ...base, inapplicable: 5 }), 'NIJE_SE_PRIMJENIO')
  assert.equal(verdictFor({ ...base, absent: 5 }), 'NIJE_SE_PRIMJENIO')
})

test('sažetak nosi broj ruta i presudu po pravilu, ne samo brojeve', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/settings', axeReport({ passed: ['label-content-name-mismatch'] }), dir)
  const summary = formatCoverageSummary(aggregateCoverage(dir))
  assert.match(summary, /axe pokrivenost — 1 ruta/)
  assert.match(summary, /2\.5\.3 label-content-name-mismatch: PROLAZ/)
  assert.match(summary, /2\.5\.8 target-size: NIJE_SE_PRIMJENIO/)
  assert.equal(summary.split('\n').length >= TRACKED_RULES.length, true)
  rmSync(dir, { recursive: true, force: true })
})

test('kriterij čije pravilo nigdje nije prošlo ne smije izgledati kao dokazan', () => {
  const dir = tempDir()
  recordAxeCoverage('chromium', '/', axeReport({ inapplicable: TRACKED_RULES.map((r) => r.rule) }), dir)
  const agg = aggregateCoverage(dir)
  for (const { rule } of TRACKED_RULES) {
    assert.equal(verdictFor(agg.totals[rule]), 'NIJE_SE_PRIMJENIO')
  }
  assert.equal(formatCoverageSummary(agg).includes('PROLAZ'), false)
  rmSync(dir, { recursive: true, force: true })
})

test('zapis je čitljiv JSON s jednim fajlom po ruti (nema prepisivanja pri fullyParallel)', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/a', axeReport({}), dir)
  recordAxeCoverage('admin', '/admin/b', axeReport({}), dir)
  const files = readdirSync(dir)
  assert.equal(files.length, 2)
  for (const name of files) {
    const parsed = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    assert.ok(parsed.project && parsed.route && parsed.rules)
  }
  // Isti poziv ne smije stvoriti drugi fajl.
  recordAxeCoverage('admin', '/admin/a', axeReport({}), dir)
  assert.equal(readdirSync(dir).length, 2)
  writeFileSync(join(dir, 'noise.txt'), 'x', 'utf8')
  assert.equal(aggregateCoverage(dir).routeCount, 2, 'ne-JSON fajlovi se preskaču')
  rmSync(dir, { recursive: true, force: true })
})

test('encodeWorkflowMessage kodira novi red — inače anotacija nosi samo prvi red', () => {
  // Izmjereno na runu 42876931983: bez kodiranja anotacija je stigla kao
  // „axe pokrivenost — 32 ruta" i svih 17 redova o pravilima je izgubljeno.
  assert.equal(encodeWorkflowMessage('a\nb'), 'a%0Ab')
  assert.equal(encodeWorkflowMessage('a\r\nb'), 'a%0D%0Ab')
  // `%` mora ići PRVI, inače bi se vlastite zamjene pokvarile.
  assert.equal(encodeWorkflowMessage('50%\n'), '50%25%0A')
  assert.equal(encodeWorkflowMessage(encodeWorkflowMessage('a\nb')), 'a%250Ab')
  assert.equal(encodeWorkflowMessage('bez specijalnih'), 'bez specijalnih')
})

test('kodirani sažetak nema sirovi novi red i nosi sva pravila', () => {
  const dir = tempDir()
  recordAxeCoverage('admin', '/admin/settings', axeReport({ passed: ['color-contrast'] }), dir)
  const encoded = encodeWorkflowMessage(formatCoverageSummary(aggregateCoverage(dir)))
  assert.equal(encoded.includes('\n'), false, 'sirovi novi red bi prekinuo workflow komandu')
  assert.equal(encoded.includes('\r'), false)
  for (const { rule } of TRACKED_RULES) assert.ok(encoded.includes(rule), `nedostaje ${rule}`)
  rmSync(dir, { recursive: true, force: true })
})

test('teardown kodira poruku, a naslov nema separatora svojstava', () => {
  const source = readFile(new URL('./coverage-teardown.ts', import.meta.url), 'utf8')
  // Poruka se dijeli na više anotacija, pa se kodira svaki DIO, ne cijeli sažetak: jedna
  // anotacija bi bila odsječena na ~2000 znakova i pola izvještaja bi se tiho izgubilo.
  assert.match(source, /chunkWorkflowMessage\(text\)/, 'svaka poruka se dijeli prije ispisa')
  assert.match(source, /encodeWorkflowMessage\(part\)/, 'kodira se dio, ne cijeli tekst')

  // Naslovi svih anotacija, ne samo prve: `:` i `,` razdvajaju svojstva u workflow komandi,
  // pa bi naslov sa zarezom tiho proizveo neispravnu komandu.
  const titles = [...source.matchAll(/emit\(\s*'(?:notice|warning)',\s*'([^']*)'/g)].map((m) => m[1])
  assert.ok(titles.length >= 3, `očekivane su barem 3 anotacije, nađeno ${titles.length}`)
  for (const title of titles) {
    assert.equal(title.includes(','), false, `naslov ne smije imati zarez: ${title}`)
    assert.equal(title.includes(':'), false, `naslov ne smije imati dvotačku: ${title}`)
  }
  assert.equal(/globalTeardown/.test(readFile(new URL('./../playwright.config.ts', import.meta.url), 'utf8')), true)
})

// ── Nepotpuni čvorovi: ŠTA je nepotpuno, ne samo KOLIKO ───────────────────────

/** Axe izvještaj s nepotpunim čvorovima kakve stvarno vraća `label-content-name-mismatch`. */
function axeReportWithNodes(rule, nodes) {
  return {
    passes: [],
    violations: [],
    incomplete: [{ id: rule, nodes }],
    inapplicable: [],
  }
}

const NODE = (label, text) => ({
  html: `<button   aria-label="${label}">${text}</button>`,
  target: ['header', `button[aria-label="${label}"]`],
  any: [{ id: 'x', message: `Vidljivi tekst "${text}" nije dio imena` }],
})

test('describeIncompleteNodes imenuje čvor, njegov HTML i axe poruku', () => {
  const out = describeIncompleteNodes(
    axeReportWithNodes('label-content-name-mismatch', [NODE('Prebaci jezik', 'BS')]),
    'label-content-name-mismatch',
  )
  assert.equal(out.length, 1)
  assert.equal(out[0].target, 'header button[aria-label="Prebaci jezik"]')
  assert.equal(out[0].html, '<button aria-label="Prebaci jezik">BS</button>', 'višestruki razmaci se sažimaju')
  assert.equal(out[0].message, 'Vidljivi tekst "BS" nije dio imena')
})

test('describeIncompleteNodes — pravilo bez nepotpunih čvorova daje prazan spisak', () => {
  assert.deepEqual(describeIncompleteNodes(axeReport({ passed: ['label'] }), 'label'), [])
  assert.deepEqual(describeIncompleteNodes(undefined, 'label'), [], 'nema izvještaja → prazno, ne pad')
  assert.deepEqual(
    describeIncompleteNodes(axeReportWithNodes('label-content-name-mismatch', []), 'label-content-name-mismatch'),
    [],
  )
})

test('describeIncompleteNodes poštuje granicu, a ne broji sve čvorove', () => {
  const nodes = Array.from({ length: 9 }, (_, i) => NODE(`L${i}`, `T${i}`))
  const out = describeIncompleteNodes(axeReportWithNodes('label-content-name-mismatch', nodes), 'label-content-name-mismatch')
  assert.equal(out.length, MAX_INCOMPLETE_NODES_PER_RULE)
  assert.equal(MAX_INCOMPLETE_NODES_PER_RULE, 3)
  assert.deepEqual(describeIncompleteNodes(axeReportWithNodes('label-content-name-mismatch', nodes), 'label-content-name-mismatch', 5).length, 5)
})

test('zapis i zbir nose nepotpune čvorove do anotacije', () => {
  const dir = tempDir()
  try {
    recordAxeCoverage(
      'chromium',
      '/',
      axeReportWithNodes('label-content-name-mismatch', [NODE('Prebaci jezik', 'BS')]),
      dir,
    )
    const raw = JSON.parse(readFileSync(join(dir, readdirSync(dir)[0]), 'utf8'))
    assert.equal(raw.incompleteNodes['label-content-name-mismatch'].length, 1)

    const agg = aggregateCoverage(dir)
    assert.equal(agg.totals['label-content-name-mismatch'].incompleteNodes.length, 1)
    assert.equal(agg.totals['label-content-name-mismatch'].incompleteNodes[0].route, '/')

    const details = formatIncompleteDetails(agg)
    assert.match(details, /2\.5\.3 label-content-name-mismatch — 1 nepotpunih čvorova:/)
    assert.match(details, /BS/, 'vidljivi tekst mora stići do anotacije')
    assert.match(details, /Prebaci jezik/, 'pristupačno ime mora stići do anotacije')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('formatIncompleteDetails je prazan kad ništa nije nepotpuno', () => {
  const dir = tempDir()
  try {
    recordAxeCoverage('chromium', '/', axeReport({ passed: ['button-name'] }), dir)
    const agg = aggregateCoverage(dir)
    assert.equal(formatIncompleteDetails(agg), '', 'prazan string, ne "undefined" ni zaglavlje bez sadržaja')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ── Dijeljenje anotacije: bez ovoga se pola izvještaja tiho izgubi ────────────

test('chunkWorkflowMessage — kratka poruka ostaje jedan dio', () => {
  assert.deepEqual(chunkWorkflowMessage('sve u jednom redu'), ['sve u jednom redu'])
})

test('chunkWorkflowMessage — dijeli po granici kodirane dužine', () => {
  const text = Array.from({ length: 20 }, (_, i) => `linija ${i}`).join('\n')
  const parts = chunkWorkflowMessage(text, 60)
  assert.ok(parts.length > 1, 'mora podijeliti')
  for (const part of parts) {
    assert.ok(encodeWorkflowMessage(part).length <= 60, 'nijedan dio ne smije preći granicu')
  }
  assert.equal(parts.join('\n'), text, 'dijeljenje ne smije izgubiti ni jedan znak')
})

test('chunkWorkflowMessage — jedan predug red se ipak razbije', () => {
  const long = 'x'.repeat(250)
  const parts = chunkWorkflowMessage(long, 50)
  assert.ok(parts.length >= 5, 'bez razbijanja bi cijela poruka ostala u jednom dijelu')
  for (const part of parts) assert.ok(part.length <= 50)
  assert.equal(parts.join(''), long)
})

test('chunkWorkflowMessage — prazan ulaz daje jedan prazan dio', () => {
  assert.deepEqual(chunkWorkflowMessage(''), [''], 'forEach nad praznim nizom ne bi ispisao ništa')
})

test('granica je ispod one koju GitHub odsijeca', () => {
  assert.ok(MAX_ANNOTATION_MESSAGE_LENGTH < 2000)
  assert.ok(MAX_ANNOTATION_MESSAGE_LENGTH > 200, 'inače bi se svaka linija dijelila zasebno')
})

test('svako praćeno pravilo ima barem jedan kriterij i bilješku', () => {
  assert.ok(TRACKED_RULES.length >= 37, `očekivano >= 37, dobijeno ${TRACKED_RULES.length}`)
  for (const entry of TRACKED_RULES) {
    assert.ok(entry.criteria.length > 0, `${entry.rule} bez kriterija`)
    assert.ok(entry.note.length > 0, `${entry.rule} bez bilješke`)
  }
  const ids = TRACKED_RULES.map((e) => e.rule)
  assert.equal(new Set(ids).size, ids.length, 'duplo praćeno pravilo bi dvostruko brojalo')
})

/* -------------------------------------------------------------------------- */
/*  assertableViolations: šta se mjeri, a šta smije rušiti CI                 */
/* -------------------------------------------------------------------------- */

test('assertableViolations — WCAG prekršaj praćenog pravila ide dalje', () => {
  const out = assertableViolations([
    { id: 'color-contrast', tags: ['wcag2aa', 'wcag143'], impact: 'serious' },
  ]);
  assert.deepEqual(
    out.map((v) => v.id),
    ['color-contrast'],
  );
});

test('assertableViolations — best-practice nalaz se ne presuđuje', () => {
  // `heading-order` i `identical-links-same-purpose` su preporuke, ne kriteriji.
  // Da ruše CI, izvještaj bi prestao biti mjerilo usaglašenosti s WCAG-om.
  const out = assertableViolations([
    { id: 'heading-order', tags: ['best-practice'], impact: 'moderate' },
    { id: 'identical-links-same-purpose', tags: ['best-practice'], impact: 'minor' },
    { id: 'page-has-heading-one', tags: ['best-practice'], impact: 'moderate' },
  ]);
  assert.deepEqual(out, []);
});

test('assertableViolations — nepraćeno pravilo se ne presuđuje ni uz WCAG tag', () => {
  // Opseg presude mora biti opseg onoga što tvrdimo da mjerimo.
  const out = assertableViolations([{ id: 'landmark-one-main', tags: ['best-practice', 'wcag2a'] }]);
  assert.deepEqual(out, []);
});

test('assertableViolations — prekršaj bez tags se ne presuđuje', () => {
  assert.deepEqual(assertableViolations([{ id: 'color-contrast' }]), []);
  assert.deepEqual(assertableViolations(undefined), []);
  assert.deepEqual(assertableViolations([]), []);
});

test('assertableViolations — custom lista praćenih pravila se poštuje', () => {
  const tracked = [{ rule: 'heading-order', criteria: ['2.4.6'], note: 'x' }];
  const out = assertableViolations(
    [
      { id: 'heading-order', tags: ['best-practice'] },
      { id: 'color-contrast', tags: ['wcag2aa'] },
    ],
    tracked,
  );
  // Ništa ne prolazi: heading-order je praćen ali nema WCAG tag, color-contrast ima WCAG
  // tag ali nije praćen. Oba uslova moraju biti ispunjena.
  assert.deepEqual(out, []);
});

test('AXE_RULE_TAGS uključuje best-practice, WCAG_TAGS ne', () => {
  // Bez `best-practice` se 2.4.4 i 2.4.6 uopće ne mjere — pravila su `absent`, a to se
  // lako pročita kao „nema takvih elemenata".
  assert.ok(AXE_RULE_TAGS.includes('best-practice'), 'best-practice mora biti uključen');
  for (const tag of ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']) {
    assert.ok(AXE_RULE_TAGS.includes(tag), `${tag} mora biti uključen`);
    assert.ok(WCAG_TAGS.includes(tag), `${tag} je WCAG nivo`);
  }
  assert.ok(!WCAG_TAGS.includes('best-practice'), 'best-practice nije WCAG nivo');
});

test('svi axe spekovi pokreću iste tagove i presuđuju preko assertableViolations', () => {
  // Čuvar: kad bi jedan spec ostao na staroj listi tagova, pravila bi na tom skupu ruta
  // bila `absent` i izvještaj bi lagao da su pokrivena.
  for (const file of ['a11y-routes', 'a11y-admin', 'a11y-stylist']) {
    const src = readFile(new URL(`./${file}.spec.ts`, import.meta.url), 'utf8');
    assert.match(src, /\.withTags\(AXE_RULE_TAGS\)/, `${file}: mora koristiti AXE_RULE_TAGS`);
    assert.match(
      src,
      /assertableViolations\(results\.violations\)/,
      `${file}: asertcija mora ići preko assertableViolations`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/*  Lokacija pada: `violations 1` bez rute nije upotrebljiv nalaz              */
/* -------------------------------------------------------------------------- */

/** axe izvještaj s čvorovima koji su PALI (ne nepotpuni). */
function axeReportWithViolations(rule, nodes) {
  return { passed: [], violations: [{ id: rule, nodes }], incomplete: [], inapplicable: [] }
}

const VIOLATION = (target, message) => ({
  html: `<h3>   Naslov</h3>`,
  target,
  any: [{ id: 'x', message }],
})

test('describeViolationNodes imenuje čvor koji je pao', () => {
  const out = describeViolationNodes(
    axeReportWithViolations('heading-order', [VIOLATION(['main', 'h3'], 'Naslov mora biti h2')]),
    'heading-order',
  )
  assert.equal(out.length, 1)
  assert.equal(out[0].target, 'main h3')
  assert.equal(out[0].html, '<h3> Naslov</h3>', 'višestruki razmaci se sažimaju')
  assert.equal(out[0].message, 'Naslov mora biti h2')
})

test('describeViolationNodes — pravilo bez pada daje prazan spisak', () => {
  assert.deepEqual(describeViolationNodes(axeReport({ passed: ['heading-order'] }), 'heading-order'), [])
  assert.deepEqual(describeViolationNodes(undefined, 'heading-order'), [], 'nema izvještaja → prazno, ne pad')
  assert.deepEqual(
    describeViolationNodes(axeReportWithViolations('heading-order', []), 'heading-order'),
    [],
  )
})

test('zapis i zbir nose pale čvorove do anotacije, s rutom', () => {
  const dir = tempDir()
  try {
    recordAxeCoverage(
      'chromium',
      '/admin/analitika',
      axeReportWithViolations('heading-order', [VIOLATION(['main', 'h3'], 'Preskočen nivo')]),
      dir,
    )
    const raw = JSON.parse(readFileSync(join(dir, readdirSync(dir)[0]), 'utf8'))
    assert.equal(raw.violationNodes['heading-order'].length, 1)

    const agg = aggregateCoverage(dir)
    assert.equal(agg.totals['heading-order'].violationNodes.length, 1)
    assert.equal(agg.totals['heading-order'].violationNodes[0].route, '/admin/analitika')

    const details = formatViolationDetails(agg)
    assert.match(details, /2\.4\.6 heading-order — 1 čvorova koji su pali:/)
    assert.match(details, /\/admin\/analitika/, 'ruta mora stići do anotacije')
    assert.match(details, /main h3/, 'selektor mora stići do anotacije')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('formatViolationDetails je prazan kad ništa nije palo', () => {
  const dir = tempDir()
  try {
    recordAxeCoverage('chromium', '/', axeReport({ passed: ['button-name'] }), dir)
    assert.equal(formatViolationDetails(aggregateCoverage(dir)), '')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('coverage-teardown iznosi i pale čvorove u zasebnu anotaciju', () => {
  const src = readFile(new URL('./coverage-teardown.ts', import.meta.url), 'utf8')
  assert.match(src, /formatViolationDetails\(agg\)/, 'teardown mora zvati formatViolationDetails')
  assert.match(
    src,
    /::\$\{level\} title=|::warning title=|::notice title=/,
    'teardown mora ispisivati workflow komandu',
  )
});

/* -------------------------------------------------------------------------- */
/*  Čuvar mapiranja: koje pravilo dokazuje koji kriterij                       */
/* -------------------------------------------------------------------------- */

test('identical-links-same-purpose je 2.4.9 (AAA), ne 2.4.4', () => {
  // axe 4.14.0 tagira ovo pravilo `wcag2aaa, wcag249`. Mapirati ga na 2.4.4 značilo bi
  // tvrditi da mjerimo „Link Purpose (In Context)" dok mjerimo „(Link Only)".
  const entry = TRACKED_RULES.find((r) => r.rule === 'identical-links-same-purpose')
  assert.ok(entry, 'pravilo mora biti praćeno')
  assert.deepEqual(entry.criteria, ['2.4.9'])
  assert.ok(
    !TRACKED_RULES.some((r) => r.criteria.includes('2.4.4')),
    'nijedno axe pravilo ne pokriva 2.4.4 — taj kriterij ostaje nemjerljiv',
  )
})

test('AAA pravila koja axe ima su praćena, a AAA tag ne presuđuje', () => {
  // axe 4.14.0 ima tačno tri AAA pravila; ostale AAA kriterije iz matrice (2.5.5, 2.4.13)
  // nema čime izmjeriti i to mora ostati vidljivo, ne prećutano.
  assert.ok(TRACKED_RULES.some((r) => r.rule === 'color-contrast-enhanced'), '1.4.6')
  assert.ok(TRACKED_RULES.some((r) => r.rule === 'meta-refresh-no-exceptions'), '2.2.4')
  assert.ok(AXE_RULE_TAGS.includes('wcag2aaa'), 'AAA pravila se moraju pokrenuti da se izmjere')
  assert.ok(!WCAG_TAGS.includes('wcag2aaa'), 'AAA nalaz ne smije rušiti CI za A/AA')
})

test('AAA prekršaj se mjeri ali ne presuđuje', () => {
  const out = assertableViolations([
    { id: 'color-contrast-enhanced', tags: ['wcag2aaa', 'wcag146'], impact: 'serious' },
  ])
  assert.deepEqual(out, [], 'AAA nije nivo usaglašenosti koji ovaj repo presuđuje')
})
