import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const HERE = fileURLToPath(new URL('.', import.meta.url))
// i18n -> src
const SRC = join(HERE, '..')

/**
 * Iznosi moraju ići kroz `formatLocalizedAmount`, ne kroz `.toFixed(2) + ' KM'`.
 *
 * IZMJERENO 2026-11-09. `formatLocalizedAmount(v, lang)` daje:
 *
 *   | unos     | `.toFixed(2)+' KM'` | bs (bs-BA)   | en (en-GB)   |
 *   |----------|--------------------|--------------|--------------|
 *   | 49.9     | `49.90 KM`         | `49,90 KM`   | `49.90 KM`   |
 *   | 1234.5   | `1234.50 KM`       | `1.234,50 KM`| `1,234.50 KM`|
 *
 * Hardkodovani `.toFixed(2) KM` je za **bs** (defaultni jezik) davao pogrešan
 * decimalni separator i nimalo grupisanja hiljada. Popravljeno na 8 korisnički
 * vidljivih mjesta: `Reservations.tsx` (3), `ReservationScheduler.tsx` (4),
 * `expense-table.helpers.ts` (1).
 *
 * `.toFixed(` sam po sebi NIJE greška — legitimno se koristi za CSV export
 * (mašinski čitljiv), za vrijednost/placeholder inputa (mora biti parsabilan)
 * i za veličinu fajla u MB. Zato je ovdje allowlist s razlogom, ne zabrana.
 */

/** `.toFixed(` dozvoljen samo ovdje, uz razlog. */
const TO_FIXED_ALLOWED = {
  'features/app-releases/app-release-create-form.tsx': 'veličina APK fajla u MB, nije novac',
  'features/daily-log/pricing-panel.tsx': 'placeholder inputa — mora biti parsabilan broj',
  'features/daily-log/use-daily-log-form.ts': 'vrijednost inputa — mora biti parsabilan broj',
  'features/finance/expense/expense-book-detail.tsx': 'CSV export — mašinski čitljiv format',
  'features/finance/income/income-book-detail.tsx': 'CSV export — mašinski čitljiv format',
}

/**
 * Ručno sastavljen `' KM'` koji JE ispravno lokalizovan, ali duplira logiku
 * helpera. Nije defekt; zabilježeno da se zna zašto nije spojeno:
 * `formatKm` na nevažećem unosu daje `0,00 KM`, a `formatLocalizedAmount` `—`,
 * pa bi spajanje promijenilo ponašanje bez vidljive dobiti.
 */
const KM_INLINE_ALLOWED = {
  'i18n/locale-utils.mjs': 'jedino mjesto gdje " KM" treba biti',
  'pages/public/PublicServiceDetail.tsx':
    'Intl.NumberFormat + getIntlLocale — ispravno, ali duplicirano; javna stranica (ne dira se)',
  'features/stylist-workbook/pages/workbook-new-entry-page.tsx':
    'formatKm — ispravno, ali se razlikuje na nevažećem unosu (0,00 KM vs —)',
}

/**
 * Traži se INTERPOLACIJA pa " KM" (`} KM`), ne bilo koje pojavljivanje " KM".
 * Širi obrazac bi hvatao i prozu poput `'Bodovi po KM'` (opis audit-log zapisa u
 * `loyalty-program-settings.tsx`) — izmjereno, lažni pozitivni.
 */
const KM_CONSTRUCTION = /\}\s*KM/

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry)
    if (statSync(abs).isDirectory()) walk(abs, out)
    else if (/\.(ts|tsx)$/.test(entry) && !entry.includes('.test.')) out.push(abs)
  }
  return out
}

const files = () =>
  walk(SRC)
    .map((abs) => [relative(SRC, abs).replaceAll('\\', '/'), readFileSync(abs, 'utf8')])
    .sort((a, b) => a[0].localeCompare(b[0]))

test('svaki .toFixed( je u allowlistu s razlogom', () => {
  const offenders = []
  for (const [name, src] of files()) {
    const count = (src.match(/\.toFixed\(/g) || []).length
    // Komentar koji objašnjava pravilo ne računa se kao upotreba.
    const inComments = (src.match(/\/\/.*\.toFixed\(/g) || []).length
    const real = count - inComments
    if (real === 0) continue
    if (!(name in TO_FIXED_ALLOWED)) {
      offenders.push(`${name}: ${real}× .toFixed( — koristi formatLocalizedAmount za iznose`)
    }
  }
  assert.deepEqual(offenders, [], 'nalazi .toFixed( izvan allowlista')

  // Allowlist ne smije zastarjeti.
  for (const name of Object.keys(TO_FIXED_ALLOWED)) {
    const found = files().find(([n]) => n === name)
    assert.ok(found, `allowlist zastario: ${name} ne postoji`)
    assert.ok(
      /\.toFixed\(/.test(found[1]),
      `allowlist zastario: ${name} više nema .toFixed(`,
    )
  }
})

test('nijedan korisnički vidljiv iznos ne sastavlja " KM" ručno', () => {
  const offenders = []
  for (const [name, src] of files()) {
    if (!KM_CONSTRUCTION.test(src)) continue
    if (name in KM_INLINE_ALLOWED) continue
    offenders.push(`${name}: sastavlja "} KM" — koristi formatLocalizedAmount`)
  }
  assert.deepEqual(offenders, [], 'ručno sastavljen iznos s " KM" izvan allowlista')

  // Allowlist ne smije zastarjeti. Čita se direktno s diska jer `i18n/locale-utils.mjs`
  // nije .ts/.tsx pa ga `walk()` ne skuplja.
  for (const name of Object.keys(KM_INLINE_ALLOWED)) {
    const src = readFileSync(join(SRC, name), 'utf8')
    assert.ok(KM_CONSTRUCTION.test(src), `allowlist zastario: ${name} više ne sastavlja " KM"`)
  }

  // Pozitivna kontrola: obrazac zaista hvata hardkodovanje.
  assert.ok(KM_CONSTRUCTION.test('{base.toFixed(2)} KM'), 'kontrola: hvata toFixed + KM')
  assert.ok(KM_CONSTRUCTION.test('`${formatLocalizedNumber(v, l)} KM`'), 'kontrola: hvata template')
  assert.ok(!KM_CONSTRUCTION.test("put('x', y, 'Bodovi po KM')"), 'kontrola: proza NIJE nalaz')
})

test('popravljena mjesta zaista koriste formatLocalizedAmount', () => {
  const read = (p) => readFileSync(join(SRC, p), 'utf8')
  const reservations = read('pages/Reservations.tsx')
  const scheduler = read('features/reservations/components/ReservationScheduler.tsx')
  const helpers = read('features/finance/expense/expense-table.helpers.ts')

  assert.equal((reservations.match(/\.toFixed\(/g) || []).length, 0, 'Reservations.tsx')
  assert.equal((scheduler.match(/\.toFixed\(/g) || []).length, 0, 'ReservationScheduler.tsx')
  assert.ok(
    /formatLocalizedAmount\(base, i18n\.language\)/.test(reservations),
    'Reservations.tsx: osnovna cijena',
  )
  assert.ok(
    /formatLocalizedAmount\(final, i18n\.language\)/.test(reservations),
    'Reservations.tsx: cijena nakon popusta',
  )
  assert.ok(
    /formatLocalizedAmount\(\s*reservationTotals\(activeReservation\)\.totalPrice/.test(scheduler),
    'ReservationScheduler.tsx: ukupno',
  )
  assert.ok(
    /formatLocalizedAmount\(Number\(fv\.value\) \|\| 0, language\)/.test(helpers),
    'expense-table.helpers.ts: detalji fiksnog troška',
  )
})

test('formatLocalizedAmount daje bs decimalni zarez i grupisanje hiljada', async () => {
  const mod = await import(new URL('./locale-utils.mjs', import.meta.url).href)
  assert.equal(mod.formatLocalizedAmount(49.9, 'bs'), '49,90 KM')
  assert.equal(mod.formatLocalizedAmount(1234.5, 'bs'), '1.234,50 KM')
  assert.equal(mod.formatLocalizedAmount(1234.5, 'en'), '1,234.50 KM')
  // `.toFixed(2)+' KM'` bi dao '49.90 KM' — ovo je defekt koji je popravljen.
  assert.notEqual(mod.formatLocalizedAmount(49.9, 'bs'), '49.90 KM')
})
