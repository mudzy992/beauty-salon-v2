import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Inventar mjesta na kojima **sirova bosanska poruka iz backenda** može stići do UI-ja.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * Backend vraća **191** različitih bosanskih poruka (izmjereno 2026-11-10), a nema
 * i18n sloj ni kodove grešaka. Frontend ih prevodi samo djelimično, kroz 5 mapa koje
 * uparuju **tačan** tekst. Ostatak stiže do korisnika nepreveden — i to na dva načina
 * koja su dosad bila **neizmjerena**:
 *
 * **B — sirov naslov.** `toast.error(getErrorMessage(err, t('...')))` — prevedeni
 *   fallback se **odbacuje** čim backend vrati poruku, pa je cijeli toast bosanski.
 * **D — sirov opis.** `useAppToast.toastApiError(err, t('...'))` radi
 *   `toast.error(fallback, { description: getErrorMessage(err, fallback) })`. Naslov
 *   je preveden, ali **opis je sirova poruka**. Render-put je potvrđen u izvoru
 *   sonner-a: `React.createElement("div", { "data-description": "" }, …description)`
 *   — opis je vidljiv tekst u DOM-u, ne samo za programere.
 *
 * Za EN korisnika to je WCAG **3.1.2** (Language of Parts): dio sadržaja je na drugom
 * jeziku i nije označen. Za čitač ekrana i za razumijevanje — nepreveden tekst.
 *
 * ── Šta ovaj test radi, a šta NE ─────────────────────────────────────────────
 * **Zaključava inventar.** Ne mijenja ponašanje i ne bira popravku: hoće li se ove
 * poruke mapirati na ključeve, označiti `lang`, ili riješiti kodovima grešaka u
 * backendu je **odluka vlasnika** (stavka `I18N-01`). Test postoji da se spisak ne
 * može tiho povećati — svako novo mjesto pada i traži da se odluka donese svjesno.
 *
 * ── Izmjereno na dan pisanja ─────────────────────────────────────────────────
 * A) mapirano (poruka ide kroz resolver pa `t()`): **8** mjesta
 * B) sirov naslov: **16** mjesta
 * C) `toastApiError` (preveden naslov, sirov opis): **37** poziva
 * Hardkodirani default `'Greška'` u `toastApiError` **nikad se ne koristi** — svih 37
 * poziva prosljeđuje drugi argument (36 s `t(...)`, 1 s prevedenom validacijskom
 * porukom iz `complete-reservation-dialog.tsx`). Zato ovdje nije naveden kao defekt.
 */

const ROOT = new URL('..', import.meta.url)
const SKIP_FILES = new Set(['useAppToast.ts', 'error.ts', 'partition.ts'])
const RESOLVERS = [
  // `resolveAdminApiError` je nadskup od `...Key` (isti modul), pa pokriva oba poziva.
  'resolveAdminApiError',
  'resolveProfileApiErrorKey',
  'getRegistrationErrorKey',
  'resolveClientReservationError',
  'resolvePublicReservationError',
]

/** Očekivano stanje — ažurirati SVJESNO kad se donese odluka o I18N-01. */
// 2026-11-10: svih 16 sirovih naslova provučeno je kroz `resolveAdminApiError`
// (odluka vlasnika, opcija (a) za I18N-01), pa je inventar sada PRAZAN.
const EXPECTED_RAW_TITLE = {}
const EXPECTED_MAPPED_COUNT = 24
const EXPECTED_TOAST_API_ERROR_CALLS = 37

function sourceFiles() {
  const out = []
  const walk = (dir, rel) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${ent.name}` : ent.name
      if (ent.isDirectory()) walk(new URL(`${ent.name}/`, dir), r)
      else if ((ent.name.endsWith('.ts') || ent.name.endsWith('.tsx')) && !ent.name.includes('.test.')) {
        out.push({ rel: r, abs: new URL(ent.name, dir) })
      }
    }
  }
  walk(ROOT, '')
  return out.filter((f) => !SKIP_FILES.has(f.rel.split('/').pop()))
}

/** Balansirani argumenti poziva, preko više linija. */
function callArgs(src, openParen) {
  let i = openParen
  let depth = 0
  let buf = ''
  while (i < src.length) {
    const ch = src[i]
    if (ch === '(') depth += 1
    else if (ch === ')') {
      if (depth === 0) break
      depth -= 1
    }
    buf += ch
    i += 1
  }
  const parts = []
  let d = 0
  let cur = ''
  for (const ch of buf) {
    if ('([{'.includes(ch)) d += 1
    else if (')]}'.includes(ch)) d -= 1
    if (ch === ',' && d === 0) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  return parts.map((s) => s.trim()).filter(Boolean)
}

function scan() {
  const rawTitle = {}
  const mapped = {}
  const regexTriage = {}
  const toastApiError = { total: 0, withSecondArg: 0, translatedSecondArg: 0 }
  let scanned = 0

  for (const { rel, abs } of sourceFiles()) {
    const src = readFileSync(abs, 'utf8')
    scanned += 1
    const lines = src.split('\n')

    for (const m of src.matchAll(/\bgetErrorMessage\s*\(/g)) {
      const line = src.slice(0, m.index).split('\n').length
      // Prozor ±4 linije: `toastApiError(...)` je često višelinijski poziv odmah ispod.
      const ctx = lines.slice(Math.max(0, line - 4), Math.min(lines.length, line + 4)).join('\n')
      // Poruka se čita, ali se NE renderuje: služi samo kao predikat za izbor
      // prevedenog naslova, a prikaz ide kroz `toastApiError` (broji se u C).
      const triage = /\.test\(\s*message\s*\)/.test(ctx) && ctx.includes('toastApiError(')
      const bucket = RESOLVERS.some((r) => ctx.includes(r)) ? mapped : triage ? regexTriage : rawTitle
      bucket[rel] = (bucket[rel] ?? 0) + 1
    }

    for (const m of src.matchAll(/\btoastApiError\s*\(/g)) {
      const args = callArgs(src, m.index + m[0].length)
      toastApiError.total += 1
      if (args.length >= 2) {
        toastApiError.withSecondArg += 1
        if (args[1].startsWith('t(')) toastApiError.translatedSecondArg += 1
      }
    }
  }
  return { rawTitle, mapped, regexTriage, toastApiError, scanned }
}

test('i18n: inventar mjesta gdje sirova backend poruka ide DIREKTNO u UI je zaključan', () => {
  const { rawTitle, scanned } = scan()
  // izmjereno 298 izvornih fajlova; prag je namjerno ispod toga
  assert.ok(scanned > 250, `skenirano samo ${scanned} fajlova — sakupljač nije obišao stablo`)
  assert.deepEqual(
    rawTitle,
    EXPECTED_RAW_TITLE,
    'Promijenio se broj mjesta gdje `getErrorMessage(...)` ide direktno u UI (cijeli toast je\n' +
      'tada bosanski, jer prevedeni fallback biva odbačen). Ako je dodano novo mjesto —\n' +
      'proširi ga kroz resolver (kao Salon/Services/Stylists/Users/Blog/Profile) ili\n' +
      'svjesno ažuriraj ovaj inventar uz odluku o I18N-01.',
  )
})

test('i18n: broj mapiranih mjesta (poruka ide kroz resolver pa t()) ne smije pasti', () => {
  const { mapped } = scan()
  const total = Object.values(mapped).reduce((a, b) => a + b, 0)
  assert.ok(
    total >= EXPECTED_MAPPED_COUNT,
    `mapiranih mjesta bilo ${EXPECTED_MAPPED_COUNT}, sada ${total} — neko je uklonio resolver`,
  )
  // pozitivna kontrola: resolveri su stvarno prepoznati u poznatim fajlovima
  for (const f of ['pages/Users.tsx', 'pages/Services.tsx', 'pages/Profile.tsx']) {
    assert.ok(mapped[f] > 0, `${f} više nema nijedno mapirano mjesto — klasifikator je pukao`)
  }
})

test('i18n: toastApiError — zaključan broj poziva i činjenica da default "Greška" nije u upotrebi', () => {
  const { toastApiError: t } = scan()
  assert.equal(
    t.total,
    EXPECTED_TOAST_API_ERROR_CALLS,
    `toastApiError poziva bilo ${EXPECTED_TOAST_API_ERROR_CALLS}, sada ${t.total}`,
  )
  // Svaki poziv prosljeđuje NASLOV. Da jedan ispadne, korisnik vidi hardkodirano
  // bosansko "Greška" iz default parametra.
  assert.equal(
    t.withSecondArg,
    t.total,
    'Neki poziv ne prosljeđuje naslov, pa se prikazuje hardkodirano bosansko "Greška"',
  )
  // 36 s t(...), 1 s prevedenom validacijskom porukom iz complete-reservation-dialog.tsx
  assert.equal(
    t.total - t.translatedSecondArg,
    1,
    'Promijenio se broj poziva koji ne koriste t(...) direktno — provjeri da li je taj preveden',
  )
})

test('i18n: mjesta gdje se poruka čita samo kao predikat (ne renderuje se) su zaključana', () => {
  const { regexTriage } = scan()
  // `use-reservation-detail-actions.ts`: `/zaključan|KIF/i.test(message)` bira između dva
  // prevedena naslova; prikaz ide kroz toastApiError, pa ovdje nema sirovog teksta.
  assert.deepEqual(
    regexTriage,
    { 'features/stylist-portal/hooks/use-reservation-detail-actions.ts': 1 },
    'Promijenio se skup mjesta koja čitaju serversku poruku samo kao regex-predikat.\n' +
      'Ako novo mjesto stvarno renderuje poruku, pripada u inventar sirovih (test 1).',
  )
})

test('pozitivna kontrola: klasifikator razlikuje mapirano od sirovog na poznatom primjeru', () => {
  const { rawTitle, mapped } = scan()
  // Users.tsx: `error(t(resolveAdminApiErrorKey(message, fallbackKey)))` -> MAPIRANO
  assert.equal(rawTitle['pages/Users.tsx'], undefined)
  assert.ok(mapped['pages/Users.tsx'] > 0)
  // Loyalty.tsx: `resolveAdminApiError(getErrorMessage(err, ''), ...)` -> MAPIRANO
  assert.ok(mapped['pages/Loyalty.tsx'] > 0)
  assert.equal(rawTitle['pages/Loyalty.tsx'], undefined)
  // i ostalih 5 fajlova koji su nekad bili sirovi
  for (const f of [
    'features/reservations/components/ReservationScheduler.tsx',
    'features/stylist-portal/pages/stylist-direct-booking-page.tsx',
    'pages/AppReleases.tsx',
    'pages/Reservations.tsx',
    'pages/ReservationsCalendar.tsx',
  ]) {
    assert.ok(mapped[f] > 0, `${f} više nema mapirano mjesto`)
    assert.equal(rawTitle[f], undefined, `${f} ima sirovo mjesto`)
  }
  // use-reservation-detail-actions.ts: predikat, NIJE sirovo
  assert.equal(rawTitle['features/stylist-portal/hooks/use-reservation-detail-actions.ts'], undefined)
})
