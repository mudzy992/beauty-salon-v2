import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Dvije klase defekta koje `jsx-a11y` NE vidi, a koje izvor jasno pokazuje.
 *
 * ── 1. `aria-label` na elementu s `role="generic"` ─────────────────────────────
 * ARIA zabranjuje `aria-label`/`aria-labelledby` na elementima čija je uloga
 * `generic` (običan `<div>`, `<span>`, `<p>` bez `role`). Preglednici i čitači
 * ekrana takav atribut **ignorišu** — axe-core to javlja kao `aria-prohibited-attr`
 * (ozbiljnost *serious*). Posljedica po WCAG ovisi o sadržaju:
 *   - ako element ima tekst, tekst je ionako pristupačno ime → atribut je samo
 *     suvišan mrtav kod (bio slučaj u `app-logo.tsx` i `uploaded-brand-logo.tsx`);
 *   - ako element nema teksta, informacija je **potpuno izgubljena** → 1.1.1
 *     (bio slučaj u `StarRating`: zvjezdice su `aria-hidden`, pa ocjena nije
 *     bila izložena nigdje).
 * `jsx-a11y` ovo ne hvata: `aria-props` provjerava samo nepostojeća ARIA imena,
 * ne i dozvoljenost po ulozi.
 *
 * ── 2. Klikabilni redak/kartica kao JEDINI put do akcije ───────────────────────
 * `<tr onClick>` / `<Card onClick>` na admin tabelama. `jsx-a11y` vidi samo JSX,
 * pa ne zna šta custom komponenta renderuje, a `<tr>` ima implicitnu ulogu `row`
 * zbog koje `no-static-element-interactions` ne reaguje. Ako uz red ne postoji
 * pravo dugme, miš je jedini put → **2.1.1 (Level A)**. Ako red JESTE fokusabilan
 * (`tabIndex` + `onKeyDown`) ali bez `role`, tastatura radi ali AT ne najavi da je
 * red aktivabilan → **4.1.2**.
 *
 * Izmjereno prije izmjena (2026-11-09), skriptom nad cijelim `src/**\/*.tsx`:
 *   - `aria-label` na generic elementu bez role: **3** (`app-logo.tsx:55`,
 *     `uploaded-brand-logo.tsx:60`, `ClientAnalytics.tsx:135`)
 *   - `<tr onClick>`: **4** fajla. Tri imaju pristupačno dugme u istom redu
 *     (`Reservations.tsx:443`, `Stylists.tsx:278`, `ClientAnalytics.tsx:482`) pa
 *     NISU prekršaj; `Reviews.tsx:164` **nije imao** nijedno → 2.1.1.
 */

const SRC = new URL('..', import.meta.url)

function walk(dir) {
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const url = new URL(`${ent.name}${ent.isDirectory() ? '/' : ''}`, dir)
    if (ent.isDirectory()) out.push(...walk(url))
    else if (ent.name.endsWith('.tsx') && !ent.name.includes('.test.')) out.push(url)
  }
  return out
}

/**
 * Brace-aware skener JSX otvarajućih tagova.
 *
 * Običan regex ovdje NE radi: `onKeyDown={(e) => { if (e.key === 'Enter') ... }}`
 * sadrži `>` unutar arrow-funkcije, pa naivno "do prvog >" odsječe tag usred
 * atributa i da lažno mjerenje (desilo se pri prvom pokušaju).
 */
function scanTags(src) {
  const tags = []
  let line = 1
  let cursor = 0
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '<') continue
    const c = src[i + 1]
    if (!c || !/[A-Za-z_]/.test(c)) continue
    let j = i + 1
    while (j < src.length && /[\w.]/.test(src[j])) j++
    const tag = src.slice(i + 1, j)
    let k = j
    let depth = 0
    let quote = null
    while (k < src.length) {
      const ch = src[k]
      if (quote) {
        if (ch === quote) quote = null
      } else if (ch === '"' || ch === "'") {
        quote = ch
      } else if (ch === '{') depth++
      else if (ch === '}') depth--
      else if (ch === '>' && depth <= 0) break
      k++
    }
    line += (src.slice(cursor, i).match(/\n/g) || []).length
    cursor = i
    tags.push({ tag, attrs: src.slice(j, k), line })
    i = k
  }
  return tags
}

const GENERIC = new Set(['div', 'span', 'p'])

test('1.1.1/4.1.2: nema aria-label/aria-labelledby na <div>/<span>/<p> bez role (cijeli src)', () => {
  const bad = []
  for (const url of walk(SRC)) {
    const src = readFileSync(url, 'utf8')
    for (const { tag, attrs, line } of scanTags(src)) {
      if (!GENERIC.has(tag)) continue
      if (!/aria-label\s*=|aria-labelledby\s*=/.test(attrs)) continue
      if (/role\s*=/.test(attrs)) continue
      bad.push(`${url.pathname.split('/src/')[1]}:${line} <${tag}>`)
    }
  }
  assert.deepEqual(
    bad,
    [],
    'aria-label na elementu s role="generic" je zabranjen i AT ga ignoriše ' +
      '(axe: aria-prohibited-attr). Dodati role (npr. role="img") ili obrisati ' +
      `suvišan atribut ako tekst ispod već jeste ime. Nađeno:\n  ${bad.join('\n  ')}`,
  )
})

test('1.1.1: StarRating izlaže ocjenu preko role="img" (zvjezdice su aria-hidden)', () => {
  const src = readFileSync(new URL('../pages/ClientAnalytics.tsx', import.meta.url), 'utf8')
  assert.match(
    src,
    /<div role="img"[^>]*aria-label=\{t\('clientAnalyticsPage\.rating'/,
    'bez role="img" čitač ekrana ne dobije NIŠTA: zvjezdice su aria-hidden, ' +
      'a aria-label na običnom <div> se ignoriše',
  )
  // pozitivna kontrola: zvjezdice stvarno jesu skrivene od AT, pa je gornji
  // aria-label jedini izvor informacije
  assert.match(src, /<Star\s[^>]*aria-hidden="true"/)
})

test('2.1.1: Reviews — detalji recenzije imaju pravo dugme, ne samo klik na red', () => {
  const src = readFileSync(new URL('../pages/Reviews.tsx', import.meta.url), 'utf8')
  assert.match(
    src,
    /<Button[^>]*aria-label=\{t\('reviews\.details'\)\}[^>]*onClick=\{\(\) => openDetail\(r\)\}/s,
    'kolona s akcijama mora imati dugme koje otvara detalje; <tr onClick> nije ' +
      'fokusabilan pa je bez njega miš jedini put (2.1.1, Level A)',
  )
  // pozitivna kontrola: dugme je DODATNI put, red i dalje radi mišem
  assert.equal(
    (src.match(/openDetail\(r\)/g) || []).length,
    2,
    'očekivan tačno jedan poziv iz reda (miš) i jedan iz dugmeta (tastatura/AT)',
  )
  assert.match(src, /import \{[^}]*\bEye\b[^}]*\} from 'lucide-react'/)
  assert.match(src, /<Eye[^>]*aria-hidden="true"/)
})

test('4.1.2: ClientAnalytics — red tabele nije fokusabilan bez role', () => {
  const src = readFileSync(new URL('../pages/ClientAnalytics.tsx', import.meta.url), 'utf8')
  // <tr> ne smije nositi tabIndex: bez role AT najavi samo "red", a pristupačni
  // put je ionako dugme "Detalji" u zadnjoj koloni.
  // Namjerno preko scanTags, NE regex-om: prvi pokušaj (`/<tr\b[^>]*tabIndex/`)
  // pogodio je komentar iznad samog reda koji objašnjava zašto tabIndex nema.
  const focusableRows = scanTags(src)
    .filter((t) => t.tag === 'tr' && /tabIndex\s*=/.test(t.attrs))
    .map((t) => `linija ${t.line}`)
  assert.deepEqual(focusableRows, [], '<tr> s tabIndex a bez role krši 4.1.2')
  // pozitivna kontrola: skener stvarno vidi <tr> tagove u ovom fajlu
  assert.ok(
    scanTags(src).some((t) => t.tag === 'tr' && /onClick\s*=/.test(t.attrs)),
    'skener mora naći klikabilan <tr>, inače gornja asertacija ne znači ništa',
  )
  assert.match(
    src,
    /aria-label=\{t\('clientAnalyticsPage\.details'\)\}\s+onClick/s,
    'pristupačni put do detalja rezervacije mora ostati dugme s aria-label',
  )
})

test('konzistentnost: sve tri admin tabele s klikabilnim redom imaju dugme po redu', () => {
  const cases = [
    ['../pages/Reservations.tsx', /reservations\.adminList\.details/],
    ['../pages/Stylists.tsx', /stylists\.aria\.edit/],
    ['../pages/ClientAnalytics.tsx', /clientAnalyticsPage\.details/],
    ['../pages/Reviews.tsx', /reviews\.details/],
  ]
  for (const [rel, key] of cases) {
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8')
    assert.match(src, /<tr\b[^>]*onClick/s, `${rel}: očekivan klikabilan red`)
    assert.match(
      src,
      new RegExp(`<Button[^>]*aria-label=\\{t\\('${key.source}'\\)\\}`.replace(/\\\//g, '/'), 's'),
      `${rel}: uz klikabilan red mora postojati dugme s aria-label ${key.source}`,
    )
  }
})

test('4.1.2: kartica recenzije — naslov je pravo dugme razvučeno preko cijele kartice', () => {
  const src = readFileSync(new URL('../pages/ClientAnalytics.tsx', import.meta.url), 'utf8')
  const tags = scanTags(src)

  // Kartica više ne smije biti fokusabilna/interaktivna na nivou <div>-a
  const badCards = tags
    .filter((t) => t.tag === 'Card' && /tabIndex\s*=|onClick\s*=|onKeyDown\s*=/.test(t.attrs))
    .map((t) => `linija ${t.line}`)
  assert.deepEqual(
    badCards,
    [],
    '<Card> je običan <div>: bez role ne smije biti fokusabilan ni nositi onClick (4.1.2)',
  )
  // pozitivna kontrola: skener stvarno vidi <Card> u ovom fajlu
  assert.ok(tags.some((t) => t.tag === 'Card'), 'skener mora naći <Card>')

  // Naslov mora biti pravo <button> razvučeno pseudo-elementom preko kartice
  const stretched = tags.filter(
    (t) =>
      t.tag === 'button' &&
      /after:absolute/.test(t.attrs) &&
      /after:inset-0/.test(t.attrs) &&
      /after:content-\[''\]/.test(t.attrs),
  )
  assert.equal(stretched.length, 1, 'očekivan tačno jedan stretched naslov-dugme')
  // bez `relative` na kartici inset-0 se veže za stranicu, ne za karticu
  assert.match(
    src,
    /<Card\s[^>]*className="relative cursor-pointer p-4 transition-shadow hover:shadow-md"/,
    'kartica mora imati `relative` da bi after:inset-0 pokrio nju, a ne cijelu stranicu',
  )
  // ime dugmeta mora sadržavati vidljivi tekst (2.5.3)
  assert.match(
    stretched[0].attrs,
    /aria-label=\{t\('clientAnalyticsPage\.reviewDetailsAction'/,
    'aria-label mora imenovati akciju, ne samo uslugu',
  )
  assert.match(
    stretched[0].attrs,
    /text-left/,
    '<button> je inače centriran — bez text-left naslov bi vizuelno skočio',
  )
  const after = src.slice(src.indexOf(stretched[0].attrs) + stretched[0].attrs.length)
  assert.match(
    after.slice(0, 200),
    /\{r\.service\?\.name \?\? '-'\}/,
    'vidljivi tekst dugmeta mora biti naziv usluge (isti koji ide u aria-label)',
  )
})

test('i18n: reviews.details postoji u oba jezika (aria-label nije goli ključ)', () => {
  for (const loc of ['bs', 'en']) {
    const json = JSON.parse(
      readFileSync(new URL(`../i18n/locales/${loc}.json`, import.meta.url), 'utf8'),
    )
    assert.ok(json.reviews?.details, `${loc}: nedostaje reviews.details`)
    assert.notEqual(json.reviews.details, 'reviews.details')
    const action = json.clientAnalyticsPage?.reviewDetailsAction
    assert.ok(action, `${loc}: nedostaje clientAnalyticsPage.reviewDetailsAction`)
    assert.match(
      action,
      /\{\{service\}\}/,
      `${loc}: ključ mora primati naziv usluge, inače ime dugmeta ne sadrži vidljivi tekst (2.5.3)`,
    )
  }
})
