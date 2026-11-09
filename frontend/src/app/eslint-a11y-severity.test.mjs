/**
 * Guard: `jsx-a11y` pravila moraju ostati na **error**.
 *
 * Zašto ovaj test postoji
 * ───────────────────────
 * `.eslintrc.cjs` je dugo držao 13 `jsx-a11y` pravila na `warn` uz napomenu „vratiti na
 * error u fazi 13". Takve namjere tiho trunu: niko ne primijeti kad se sniženje doda, a
 * `npm run lint` i dalje izlazi zeleno. Test čita **rezolvanu** konfiguraciju (preko
 * ESLint API-ja, dakle uključujući `extends: plugin:jsx-a11y/recommended` i `overrides`),
 * pa ne prolazi ako neko pravilo postane `warn` bilo gdje — ni u `rules`, ni u override-u.
 *
 * Test NE vjeruje sirovom objektu iz `.eslintrc.cjs`: pita ESLint koji nivo stvarno
 * važi za konkretan fajl. To hvata i slučaj „config kaže error, ali ga override poništi".
 *
 * 🔴 Šta ovaj test NE dokazuje: `jsx-a11y` vidi samo JSX. Custom komponenta koja
 * renderuje interaktivni DOM (npr. `<Card>` = običan `<div>`) prolazi neoznačeno — tako
 * je stvarni 2.1.1 u `Gallery.tsx` prošao lint dok su sva upozorenja bila lažno pozitivna.
 * Lint nije zamjena za source-contract testove, niti obrnuto.
 */
import { strict as assert } from 'node:assert'
import { ESLint } from 'eslint'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// `eslint-plugin-jsx-a11y` je CommonJS, pa named import iz ESM-a ne radi.
const { rules: jsxAllyRules } = createRequire(import.meta.url)('eslint-plugin-jsx-a11y')

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FRONTEND = resolve(SRC, '..')

/** Nivoi: 0 = off, 1 = warn, 2 = error. ESLint normalizuje 'off'/'warn'/'error' u brojeve. */
const OFF = 0
const WARN = 1
const ERROR = 2

const severityName = (n) => ({ 0: 'off', 1: 'warn', 2: 'error' })[n] ?? String(n)

/**
 * ESLintov `calculateConfigForFile` vraća nivoe onako kako su upisani u config —
 * dakle **string** `'error'`, a ne broj `2`. Bez ove normalizacije poređenja poput
 * `nivo !== OFF` bi bila istinita za svaki string i asertacije bi se **tiho preskakale**
 * (test prolazi, a ne provjerava ništa). Zato nepoznat nivo baca, umjesto da prođe.
 */
function normalizujNivo(v) {
  const raw = Array.isArray(v) ? v[0] : v
  if (raw === 'off' || raw === 0) return OFF
  if (raw === 'warn' || raw === 1) return WARN
  if (raw === 'error' || raw === 2) return ERROR
  throw new Error(`nepoznat nivo pravila: ${JSON.stringify(raw)}`)
}

/** Pravila koja su u `.eslintrc.cjs` bila lokalno spuštena na `warn`. */
const PRETHODNO_SNIZENA = [
  'alt-text',
  'anchor-has-content',
  'aria-props',
  'aria-role',
  'aria-unsupported-elements',
  'img-redundant-alt',
  'no-redundant-roles',
  'role-has-required-aria-props',
  'role-supports-aria-props',
  'label-has-associated-control',
  'click-events-have-key-events',
  'no-static-element-interactions',
  'no-noninteractive-element-interactions',
]

/**
 * `jsx-a11y` pravila koja smiju biti `off`, i samo u tim direktorijima.
 * Oba su dokumentovana lažno pozitivna (vidi `.eslintrc.cjs`):
 *  - `anchor-has-content` u testovima (testovi čitaju izvor i sadrže markdown linkove)
 *  - `heading-has-content` u shadcn primitivima (`<h5 {...props} />` dobija sadržaj od pozivaoca)
 */
/**
 * Pravila koja su `off` već u `plugin:jsx-a11y/recommended` (upstream odluka, ne naša).
 * `label-has-for` je deprecated u korist `label-has-associated-control`.
 */
const OFF_U_RECOMMENDED = new Set([
  'jsx-a11y/anchor-ambiguous-text',
  'jsx-a11y/control-has-associated-label',
  'jsx-a11y/label-has-for',
])

const DOZVOLJENO_OFF = {
  'src/app/': { 'jsx-a11y/anchor-has-content': true },
  'src/features/': { 'jsx-a11y/anchor-has-content': true },
  'src/components/ui/': { 'jsx-a11y/heading-has-content': true },
}

const eslint = new ESLint({ cwd: FRONTEND })

/** Uzorak fajla za koji pitamo rezolvanu konfiguraciju. */
const UZORAK = 'src/pages/Gallery.tsx'

/**
 * Dozvoljeni `eslint-disable` za `jsx-a11y` — svaki je dokazan lažno pozitivan.
 * Ključ: relativna putanja. Vrijednost: pravila + obavezna ključna riječ obrazloženja.
 *
 * Novi disable se ne može dodati tiho: ovaj popis je jedini izvor istine, pa dodavanje
 * pada dok se svjesno ne proširi (uz dokaz u `.eslintrc.cjs` komentarima i CHANGELOG-u).
 */
const DOZVOLJENI_DISABLE = [
  {
    fajl: 'src/features/daily-log/entry-form-fields.tsx',
    pravila: ['click-events-have-key-events'],
    kljucnaRijec: 'combobox',
    koliko: 2,
  },
  {
    fajl: 'src/features/reservations/components/ReservationScheduler.tsx',
    pravila: ['click-events-have-key-events'],
    kljucnaRijec: 'combobox',
    koliko: 1,
  },
  {
    fajl: 'src/pages/Services.tsx',
    pravila: ['click-events-have-key-events', 'no-static-element-interactions'],
    kljucnaRijec: 'propagacij',
    koliko: 1,
  },
]

/** Rekursivno sakupi `.ts`/`.tsx` fajlove ispod `SRC`. */
function izvorneDatoteke(dir = SRC, acc = []) {
  for (const ime of readdirSync(dir)) {
    const puna = join(dir, ime)
    if (statSync(puna).isDirectory()) izvorneDatoteke(puna, acc)
    else if (ime.endsWith('.tsx') || (ime.endsWith('.ts') && !ime.endsWith('.d.ts'))) acc.push(puna)
  }
  return acc
}

/** Sve `eslint-disable*` direktive za jsx-a11y u `src/`, s brojevima linija. */
function nadjeneDisableDirektive() {
  const RE = /eslint-disable(?:-next-line|-line)?\s+([^\n*]*jsx-a11y\/[^\n]*)/
  const out = []
  for (const puna of izvorneDatoteke()) {
    const linije = readFileSync(puna, 'utf8').split('\n')
    const rel = puna.slice(SRC.length + 1).replace(/^/, 'src/')
    linije.forEach((linija, i) => {
      const m = linija.match(RE)
      if (!m) return
      const pravila = m[1]
        .split(',')
        .map((s) => s.trim().replace(/^jsx-a11y\//, '').replace(/\s.*$/, ''))
        .filter((s) => s.length > 0)
      out.push({ rel, linija: i + 1, pravila, tekst: linija.trim(), linije })
    })
  }
  return out
}

test('normalizator prepoznaje i string i brojčani nivo (inače asertacije vakuumski prolaze)', () => {
  assert.equal(normalizujNivo(['error']), ERROR)
  assert.equal(normalizujNivo('error'), ERROR)
  assert.equal(normalizujNivo(['warn']), WARN)
  assert.equal(normalizujNivo(1), WARN)
  assert.equal(normalizujNivo(['off']), OFF)
  assert.equal(normalizujNivo(0), OFF)
  assert.throws(() => normalizujNivo(['nevaljano']), /nepoznat nivo/)
})

test('nijedno jsx-a11y pravilo nije na warn u rezolvanoj konfiguraciji', async () => {
  const cfg = await eslint.calculateConfigForFile(UZORAK)
  const a11y = Object.entries(cfg.rules).filter(([k]) => k.startsWith('jsx-a11y/'))

  assert.ok(a11y.length >= 30, `očekivano 30+ jsx-a11y pravila, dobijeno ${a11y.length}`)

  const naWarn = a11y.filter(([, v]) => normalizujNivo(v) === WARN).map(([k]) => k)
  assert.deepEqual(
    naWarn,
    [],
    'ova jsx-a11y pravila su na warn, a moraju biti na error ili dokumentovano off: ' + naWarn.join(', '),
  )
})

test('svih 13 prethodno sniženih pravila sada je error', async () => {
  // Imena moraju postojati u pluginu: bez ovoga greška u kucanju (npr. nepostojeće
  // `img-redundant-roles` umjesto `img-redundant-alt`) izgleda kao „config je prazan".
  const postoje = Object.keys(jsxAllyRules)
  const nepostojece = PRETHODNO_SNIZENA.filter((r) => !postoje.includes(r))
  assert.deepEqual(nepostojece, [], 'nepostojeća jsx-a11y pravila u listi: ' + nepostojece.join(', '))

  const cfg = await eslint.calculateConfigForFile(UZORAK)
  const pogresna = []
  for (const r of PRETHODNO_SNIZENA) {
    const v = cfg.rules[`jsx-a11y/${r}`]
    const nivo = normalizujNivo(v)
    if (nivo !== ERROR) pogresna.push(`jsx-a11y/${r}=${severityName(nivo)}`)
  }
  assert.deepEqual(pogresna, [], 'pravila koja nisu na error: ' + pogresna.join(', '))
})

test('label-has-associated-control koristi depth: 4 (default 2 ne doseže tekst u <span>)', async () => {
  const cfg = await eslint.calculateConfigForFile(UZORAK)
  const v = cfg.rules['jsx-a11y/label-has-associated-control']
  assert.ok(Array.isArray(v), 'pravilo mora imati opcije, a nema ih')
  const opts = v[1] ?? {}
  assert.ok(
    typeof opts.depth === 'number' && opts.depth >= 4,
    `depth mora biti >= 4, dobijeno ${opts.depth}`,
  )
})

test('jedina jsx-a11y pravila na off su dokumentovani izuzeci po direktoriju', async () => {
  const provjere = [
    'src/pages/Gallery.tsx',
    'src/components/ui/card.tsx',
    'src/features/daily-log/entry-form-fields.tsx',
  ]
  for (const uzorak of provjere) {
    const cfg = await eslint.calculateConfigForFile(uzorak)
    const dozvole = Object.keys(DOZVOLJENO_OFF).find((pref) => uzorak.startsWith(pref))
    for (const [pravilo, v] of Object.entries(cfg.rules)) {
      if (!pravilo.startsWith('jsx-a11y/')) continue
      if (normalizujNivo(v) !== OFF) continue
      if (OFF_U_RECOMMENDED.has(pravilo)) continue
      const dozvoljeno = dozvole ? DOZVOLJENO_OFF[dozvole][pravilo] === true : false
      assert.ok(dozvoljeno, `${uzorak}: ${pravilo} je off, a nije ni u DOZVOLJENO_OFF ni u recommended`)
    }
  }
})

test('svaki eslint-disable za jsx-a11y je na popisu i ima obrazloženje', () => {
  const nadjeno = nadjeneDisableDirektive()

  // 1) Ukupan broj mora odgovarati popisu — novi disable ne prolazi tiho.
  const ocekivano = DOZVOLJENI_DISABLE.reduce((a, d) => a + d.koliko, 0)
  assert.equal(
    nadjeno.length,
    ocekivano,
    `nađeno ${nadjeno.length} jsx-a11y disable direktiva, a popis dozvoljava ${ocekivano}: ` +
      nadjeno.map((d) => `${d.rel}:${d.linija}`).join(', '),
  )

  // 2) Grupisano po fajlu mora tačno odgovarati (fajl + pravila + broj).
  const poFajlu = new Map()
  for (const d of nadjeno) poFajlu.set(d.rel, (poFajlu.get(d.rel) ?? 0) + 1)
  const ocekivanoPoFajlu = new Map(DOZVOLJENI_DISABLE.map((d) => [d.fajl, d.koliko]))
  assert.deepEqual([...poFajlu].sort(), [...ocekivanoPoFajlu].sort())

  // 3) Svaka direktiva: prava pravila + obrazloženje iznad s obaveznom ključnom riječi.
  for (const d of nadjeno) {
    const dozvola = DOZVOLJENI_DISABLE.find((x) => x.fajl === d.rel)
    assert.ok(dozvola, `${d.rel}:${d.linija} nije u DOZVOLJENI_DISABLE`)
    assert.deepEqual(
      [...d.pravila].sort(),
      [...dozvola.pravila].sort(),
      `${d.rel}:${d.linija} gasi ${d.pravila.join('+')}, a dozvoljeno je ${dozvola.pravila.join('+')}`,
    )
    const iznad = d.linije.slice(Math.max(0, d.linija - 7), d.linija - 1).join('\n')
    assert.ok(
      iznad.includes(dozvola.kljucnaRijec),
      `${d.rel}:${d.linija} nema obrazloženje s ključnom riječi "${dozvola.kljucnaRijec}" iznad`,
    )
  }
})

test('nijedan jsx-a11y disable ne gasi pravilo van dva dokazano lažno pozitivna obrasca', () => {
  const DOZVOLJENA_PRAVILA = new Set(['click-events-have-key-events', 'no-static-element-interactions'])
  const nedozvoljeno = nadjeneDisableDirektive()
    .flatMap((d) => d.pravila.filter((p) => !DOZVOLJENA_PRAVILA.has(p)).map((p) => `${d.rel}:${d.linija} ${p}`))
  assert.deepEqual(nedozvoljeno, [], 'disable izvan dozvoljenih pravila: ' + nedozvoljeno.join(', '))
})
