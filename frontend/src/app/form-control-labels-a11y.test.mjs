import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * WCAG 1.3.1 / 3.3.2 / 4.1.2 — svaka form kontrola mora imati programsko ime.
 *
 * `jsx-a11y/label-has-associated-control` provjerava samo **labelu bez kontrole**,
 * ne i obrnuto: kontrola bez labele mu je nevidljiva. Zato repo-wide sweep.
 *
 * Izmjereno 2026-11-09 (skriptom nad cijelim `src/**\/*.tsx`), prije izmjena —
 * 13 pogodaka, od toga **3 stvarna prekršaja u opsegu**:
 *
 * | Mjesto | Stanje | Presuda |
 * |---|---|---|
 * | `entry-filters.tsx:58,69,80` | dva `<Input type="date">` i `<select>` s vidljivim `<p>` umjesto labele | 🔴 1.3.1/3.3.2 — `<p>` nije povezan s poljem |
 * | `Reservations.tsx:645` | `<Textarea>` za razlog otkazivanja; naslov i pomoć su `<p>`, polje ima samo placeholder | 🔴 3.3.2 — placeholder nestaje čim korisnik kuca |
 * | `Reviews.tsx:122` | `<select>` filter bez **ijedne** labele (vidljive ili programske) | 🔴 1.3.1/3.3.2/4.1.2 |
 * | `blog-post-form-dialog.tsx:180` | `<input type="file" className="hidden">` | nije prekršaj — `display:none` ga vadi iz stabla, pokreće ga `<Button>` s vidljivim tekstom |
 * | `Register.tsx:239` | isto kao gore | nije prekršaj (uz to Q2: van redizajna) |
 * | `components/ui/{input,textarea}.tsx` | primitivi koji samo prosljeđuju props | nisu prekršaj |
 * | `EmailSettings.tsx:926,1089,1100` | **stvarne rupe** (drugi input u paru dijeli labelu; dva `<select>` bez imena) | 🔴 ali fajl je pod „ne dirati" — dug, vidi allowlist |
 *
 * Uz to: `entry-filters.tsx` bio je **jedini** filter bar u dashboardu s golim `<p>` —
 * `expense-filters`, `income-entry-filters` i `reservation-filters` svi koriste
 * `<Label htmlFor>`. Ispravka je zato i ispravka konzistentnosti.
 */

const SRC = new URL('..', import.meta.url)

/**
 * Allowlist: PUNA relativna putanja (od `src/`) + razlog.
 * Ključ bez razloga ne prolazi — provjera ispod to asertuje.
 */
const ALLOWLIST = {
  'components/ui/input.tsx':
    'primitiv koji samo prosljeđuje props; ime daje pozivalac',
  'components/ui/textarea.tsx':
    'primitiv koji samo prosljeđuje props; ime daje pozivalac',
  'pages/EmailSettings.tsx':
    'DUG: 926 drugi input u paru dijeli labelu s prvim, 1089 i 1100 dva <select> bez imena. ' +
    'Stvarni prekršaji, ali fajl je pod odlukom vlasnika „ne dirati" (1381 ln). ' +
    'Skinuti s allowlist-a čim vlasnik odobri izmjenu.',
}

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
 * Zakomentariše komentare **bez pomjeranja offset-a** (svaki znak → razmak,
 * novi red ostaje). Bez toga skener pogodi `<select>` koji stoji u komentaru —
 * desilo se pri mjerenju (`manual-entry-dialog.tsx:24`).
 */
function blankComments(src) {
  const out = src.split('')
  let i = 0
  let quote = null
  while (i < src.length) {
    const c = src[i]
    const n = src[i + 1]
    if (quote) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === quote) quote = null
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      i++
      continue
    }
    if (c === '/' && n === '*') {
      let j = i
      while (j < src.length && !(src[j] === '*' && src[j + 1] === '/')) {
        if (src[j] !== '\n') out[j] = ' '
        j++
      }
      out[j] = ' '
      out[j + 1] = ' '
      i = j + 2
      continue
    }
    if (c === '/' && n === '/') {
      let j = i
      while (j < src.length && src[j] !== '\n') {
        out[j] = ' '
        j++
      }
      i = j
      continue
    }
    i++
  }
  return out.join('')
}

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
    let q = null
    while (k < src.length) {
      const ch = src[k]
      if (q) {
        if (ch === q) q = null
      } else if (ch === '"' || ch === "'") q = ch
      else if (ch === '{') depth++
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

const CONTROLS = new Set(['Input', 'Textarea', 'SelectTrigger', 'input', 'textarea', 'select'])
const SKIP_TYPE = /type\s*=\s*["'](?:hidden|submit|button|reset)["']/
// `className="hidden"` => display:none => element nije u pristupačnom stablu i nije
// fokusabilan, pa nije izložena UI komponenta. To je razlog za preskakanje, a NE
// `type="file"`: vidljiv file input bez labele JESTE prekršaj.
const SKIP_HIDDEN = /className\s*=\s*(?:"[^"]*\bhidden\b|'[^']*\bhidden\b)/

function unlabeledIn(relPath, raw) {
  const src = blankComments(raw)
  const tags = scanTags(src)
  const targets = new Set()
  let hasBareLabel = false
  for (const { tag, attrs } of tags) {
    if (tag !== 'Label' && tag !== 'label') continue
    const m = /htmlFor\s*=\s*("([^"]*)"|'([^']*)'|\{([^{}]*)\})/.exec(attrs)
    if (m) targets.add((m[2] ?? m[3] ?? m[4] ?? '').trim())
    else hasBareLabel = true
  }
  const bad = []
  for (const { tag, attrs, line } of tags) {
    if (!CONTROLS.has(tag)) continue
    if (SKIP_TYPE.test(attrs) || SKIP_HIDDEN.test(attrs)) continue
    if (/aria-label\s*=|aria-labelledby\s*=|aria-hidden\s*=\s*["']true/.test(attrs)) continue
    const idm = /\bid\s*=\s*("([^"]*)"|'([^']*)'|\{([^{}]*)\})/.exec(attrs)
    const ident = idm ? (idm[2] ?? idm[3] ?? idm[4] ?? '').trim() : ''
    if (ident && targets.has(ident)) continue
    if (hasBareLabel) continue // <label> bez htmlFor omotava kontrolu
    bad.push({ rel: relPath, line, tag })
  }
  return bad
}

test('1.3.1/3.3.2: nijedna form kontrola nije bez programskog imena (cijeli src)', () => {
  const bad = []
  const usedAllow = new Set()
  for (const url of walk(SRC)) {
    const rel = url.pathname.split('/src/')[1]
    const raw = readFileSync(url, 'utf8')
    const found = unlabeledIn(rel, raw)
    if (found.length === 0) continue
    if (Object.hasOwn(ALLOWLIST, rel)) {
      usedAllow.add(rel)
      continue
    }
    bad.push(...found.map((f) => `${f.rel}:${f.line} <${f.tag}>`))
  }
  assert.deepEqual(
    bad,
    [],
    'Kontrola bez aria-label/aria-labelledby i bez <label htmlFor> nema programsko ime. ' +
      'Dodati <Label htmlFor> (obrazac iz filter barova) ili aria-labelledby/aria-describedby ' +
      'na postojeći vidljivi tekst.\n  ' + bad.join('\n  '),
  )
  // pozitivna kontrola: sweep stvarno nešto i nalazi, inače allowlist krije sve
  let scannedControls = 0
  for (const url of walk(SRC)) {
    const src = blankComments(readFileSync(url, 'utf8'))
    scannedControls += scanTags(src).filter(
      (t) => CONTROLS.has(t.tag) && !SKIP_TYPE.test(t.attrs) && !SKIP_HIDDEN.test(t.attrs),
    ).length
  }
  assert.ok(scannedControls > 100, `sweep je vidio samo ${scannedControls} kontrola — premalo`)
  // allowlist ne smije zarđati: svaka stavka mora odgovarati stvarnom fajlu s pogotkom
  assert.deepEqual([...usedAllow].sort(), Object.keys(ALLOWLIST).sort(),
    'allowlist i stvarni pogoci se ne poklapaju — neku stavku treba obrisati')
})

test('svaka allowlist stavka ima razlog (ne prazan string)', () => {
  for (const [k, v] of Object.entries(ALLOWLIST)) {
    assert.match(k, /^(components|features|pages|layouts)\//, `${k}: ključ mora biti puna relativna putanja od src/`)
    assert.ok(typeof v === 'string' && v.trim().length > 20, `${k}: nedostaje obrazloženje`)
  }
})

test('1.3.1: daily-log filter bar koristi <Label htmlFor> kao i ostali filter barovi', () => {
  const src = readFileSync(
    new URL('../features/daily-log/entry-filters.tsx', import.meta.url),
    'utf8',
  )
  for (const [ident, key] of [
    ['daily-log-from-date', 'dailyLog.list.fromDate'],
    ['daily-log-to-date', 'dailyLog.list.toDate'],
    ['daily-log-stylist', 'dailyLog.list.stylist'],
  ]) {
    assert.match(
      src,
      new RegExp(`<Label htmlFor="${ident}"[^>]*>\\s*\\{t\\('${key.replace(/\./g, '\\.')}'\\)\\}`),
      `${key}: vidljiva labela mora biti <Label htmlFor="${ident}">`,
    )
    assert.match(src, new RegExp(`id="${ident}"`), `${key}: kontrola mora imati id="${ident}"`)
  }
  // regresija: goli <p> kao pseudo-labela se ne smije vratiti
  assert.equal(
    (src.match(/<p className="mb-1 text-xs text-content-muted">/g) || []).length,
    0,
    'pseudo-labela <p> se vratila u filter bar',
  )
})

test('3.3.2: razlog otkazivanja ima aria-labelledby + aria-describedby', () => {
  const src = readFileSync(new URL('../pages/Reservations.tsx', import.meta.url), 'utf8')
  assert.match(src, /<p id=\{cancelTitleId\}[^>]*>\{t\('reservations\.adminDetail\.cancelTitle'\)\}/)
  assert.match(src, /<p id=\{cancelHelpId\}[^>]*>\{t\('reservations\.adminDetail\.cancelHelp'\)\}/)
  assert.match(
    src,
    /<Textarea\s+aria-labelledby=\{cancelTitleId\}\s+aria-describedby=\{cancelHelpId\}/,
    'polje mora biti programski povezano i s naslovom i s pomoći',
  )
  // hookovi iznad svakog early return-a UNUTAR komponente (React #310).
  // Namjerno ne „prije prvog `return (` u fajlu" — prvi pokušaj je pogodio helper
  // definisan iznad komponente i dao lažan pad.
  const comp = src.indexOf('export default function Reservations')
  const decl = src.indexOf('const cancelTitleId = useId()')
  assert.ok(comp > -1, 'nije nađen početak komponente')
  assert.ok(decl > comp, 'useId() mora biti unutar komponente')
  // Cilja se EARLY RETURN komponente (uvlačenje 2 razmaka), ne `return` unutar
  // arrow-helpera — prvi pokušaj s /\breturn\s*[(;]/ pogodio je `getListStylistName`
  // (linija 106) i dao lažan pad.
  assert.ok(
    !/\n {2}return\s*[(;]/.test(src.slice(comp, decl)),
    'između početka komponente i useId() ne smije biti early return-a (React #310)',
  )
  assert.ok(
    decl < src.indexOf('aria-labelledby={cancelTitleId}'),
    'deklaracija mora prethoditi upotrebi',
  )
})

test('4.1.2: filter recenzija ima programsku labelu', () => {
  const src = readFileSync(new URL('../pages/Reviews.tsx', import.meta.url), 'utf8')
  assert.match(
    src,
    /<select\s+aria-label=\{t\('reviews\.filterLabel'\)\}/,
    'filter je AT imenovao tek po izabranoj opciji',
  )
  for (const loc of ['bs', 'en']) {
    const json = JSON.parse(
      readFileSync(new URL(`../i18n/locales/${loc}.json`, import.meta.url), 'utf8'),
    )
    assert.ok(json.reviews?.filterLabel, `${loc}: nedostaje reviews.filterLabel`)
  }
})
