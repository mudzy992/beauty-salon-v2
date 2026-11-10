import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

/**
 * Guard: svaki ključ koji kod traži mora se **stvarno prikazati**.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * Vlasnik je prijavio da se na `/stylist/workbook` tekst ne prikazuje kako
 * treba. Uzrok, izmjeren 2026-11-09:
 *
 *   `workbook-list-page.tsx:112` i `:150` zvali su `t('stylistWorkbook.newEntry')`.
 *   Ali `stylistWorkbook.newEntry` **nije string nego imenski prostor** — objekat
 *   s ~40 ključeva (`title`, `client`, `service`, `paidAmount`, …). i18next nad
 *   granom ne može naći prijevod i **vraća sam ključ**, pa su oba dugmeta
 *   („Novi unos") na stranici ispisivala doslovno `stylistWorkbook.newEntry`.
 *   Ispravno je `stylistWorkbook.newEntry.title`.
 *
 * ── Zašto postojeće provjere ovo NISU hvatale ────────────────────────────────
 * `check_i18n.py --strict` poredi **BS ↔ EN** (paritet listova) i prolazi savršeno
 * kad ključ nedostaje u **oba** jezika ili kad se traži grana. Nedostajala je
 * provjera u smjeru **kod → lokali**. Ovaj test je ta provjera.
 *
 * ── Šta sve spada u „ne prikazuje se kako treba" ─────────────────────────────
 * 1. ključ ne postoji ni u jednom lokalnom fajlu → ispisuje se goli ključ;
 * 2. ključ postoji ali je **grana** (imenski prostor) → isto, goli ključ;
 * 3. ključ postoji, ali vrijednost ima `{{x}}` a poziv ne prosljeđuje `x` →
 *    ispisuje se doslovno `{{x}}`;
 * 4. isto za ključeve koji se ne zovu kroz `t()` nego prenose indirektno
 *    (`labelKey:`, `headerKey:`, `titleKey:`, `key:` u `seo/dashboard-titles.ts`).
 *
 * Mjerenje prije izmjena: **2084** literalna `t()` ključa — 2077 list/leaf,
 * **6** pluralnih (postoje kao `_one`/`_few`/`_other`, što je ispravno) i
 * **1** grana (upravo `stylistWorkbook.newEntry`). Interpolacija: 0 stvarnih
 * propusta. Indirektni ključevi: **123**, 0 propusta.
 */

const SRC = new URL('..', import.meta.url)
const PLURAL = ['_zero', '_one', '_two', '_few', '_many', '_other']

function loadLocale(loc) {
  return JSON.parse(readFileSync(new URL(`../i18n/locales/${loc}.json`, import.meta.url), 'utf8'))
}
const BS = loadLocale('bs')
const EN = loadLocale('en')

/** 'leaf' | 'plural' | 'branch' | 'missing' */
function resolve(root, key) {
  let cur = root
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) {
      for (const suf of PLURAL) {
        let c = root
        let ok = true
        for (const q of (key + suf).split('.')) {
          if (c === null || typeof c !== 'object' || !(q in c)) {
            ok = false
            break
          }
          c = c[q]
        }
        if (ok && (typeof c !== 'object' || c === null)) return 'plural'
      }
      return 'missing'
    }
    cur = cur[part]
  }
  return cur !== null && typeof cur === 'object' ? 'branch' : 'leaf'
}

function valueOf(root, key) {
  let cur = root
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return null
    cur = cur[part]
  }
  if (typeof cur === 'string') return cur
  for (const suf of PLURAL) {
    let c = root
    let ok = true
    for (const q of (key + suf).split('.')) {
      if (c === null || typeof c !== 'object' || !(q in c)) {
        ok = false
        break
      }
      c = c[q]
    }
    if (ok && typeof c === 'string') return c
  }
  return null
}

function placeholders(value) {
  return new Set([...(value ?? '').matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)].map((m) => m[1]))
}

/**
 * Zakomentariše komentare **bez pomjeranja offset-a** (svaki znak -> razmak, novi red
 * ostaje), pa brojevi linija ostaju tačni.
 *
 * 🔴 Bez toga sakupljač čita i `t()` iz JSDoc-a: `filter-bar.tsx:12` ima
 * „npr. rezultat `t('table.showingRange', ...)`" u komentaru, što je dalo lažan nalaz.
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

function walk(dir) {
  const out = []
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const url = new URL(`${ent.name}${ent.isDirectory() ? '/' : ''}`, dir)
    if (ent.isDirectory()) out.push(...walk(url))
    else if (/\.(tsx?|mts)$/.test(ent.name) && !ent.name.includes('.test.')) out.push(url)
  }
  return out
}

/**
 * Vadi `t('ključ'` i, ako postoji, objekat s opcijama — brace-aware, jer opcije
 * znaju biti višelinijske i sadržavati ugniježđene `{}`.
 *
 * 🔴 Naivni regex ovdje daje lažne rezultate na dva načina (oba izmjerena):
 *   - `\{([^{}]*)\}` ne vidi ugniježđene objekte;
 *   - traženje imena svojstava s `(?:^|,)\s*(\w+)\s*(?:,|$)` preskače shorthand
 *     jer se preklapajući matchevi ne vide — `{ rating, max }` je prijavilo da
 *     nedostaje `max`. Zato se svojstva vade po dijelovima na dubini 1.
 */
/**
 * Imena svojstava na dubini 0 objekta s opcijama.
 *
 * 🔴 Prva verzija je dijelila tijelo po zarezima pa na svakom dijelu tražila
 * `^\s*(\w+)\s*:?\s*(?:$|[=(])` — to NE prepoznaje `amount: formatX(…)`, pa je
 * test prijavio ~100 lažnih propusta na pozivima koji su svi ispravni
 * (`{ service: svc.name }`, `{ items: …, amount: … }`). Sada se ide znak po znak:
 * na dubini 0 uhvati se identifikator i provjeri sljedeći značajan znak — `:`
 * znači obično svojstvo, `,`/kraj znači shorthand.
 */
function optionNames(body) {
  const names = new Set()
  let depth = 0
  let quote = null
  let i = 0
  while (i < body.length) {
    const ch = body[i]
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = null
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      i++
      continue
    }
    if (ch === '{' || ch === '(' || ch === '[') {
      depth++
      i++
      continue
    }
    if (ch === '}' || ch === ')' || ch === ']') {
      depth--
      i++
      continue
    }
    if (depth === 0 && /[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < body.length && /[A-Za-z0-9_$]/.test(body[j])) j++
      const name = body.slice(i, j)
      let k = j
      while (k < body.length && /\s/.test(body[k])) k++
      const next = body[k]
      // `:` => obično svojstvo; `,` ili kraj => shorthand. Bilo šta drugo
      // (npr. `?` iz ternary-ja) nije svojstvo.
      if (next === ':' || next === ',' || next === undefined) names.add(name)
      i = j
      continue
    }
    i++
  }
  return names
}

function collect() {
  const direct = []
  const indirect = []
  const T = /\bt\(\s*(['"])((?:[^'"\\]|\\.)*)\1/g
  const KEYPROP = /\b([A-Za-z_][A-Za-z0-9_]*Key)\s*:\s*(['"])([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)\2/g
  const TITLEKEY = /\bkey:\s*(['"])([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)\1/g

  for (const url of walk(SRC)) {
    const rel = url.pathname.split('/src/')[1]
    const src = blankComments(readFileSync(url, 'utf8'))

    for (const m of src.matchAll(T)) {
      const key = m[2]
      // null  = poziv bez ikakvih opcija (npr. t('key'))
      // 'dynamic' = drugi argument je izraz, ne objekat literal (npr.
      //             t('adminAnalytics.chartAriaLabel', chartSummary)) — statički
      //             se ne može provjeriti, pa se PRESKAČA, ne prijavljuje.
      let opts = null
      let i = m.index + m[0].length
      while (i < src.length && /\s/.test(src[i])) i++
      if (src[i] === ',') {
        i++
        while (i < src.length && /\s/.test(src[i])) i++
        if (src[i] !== '{') {
          opts = 'dynamic'
        }
        if (opts === null && src[i] === '{') {
          let depth = 0
          let quote = null
          let j = i
          for (; j < src.length; j++) {
            const ch = src[j]
            if (quote) {
              if (ch === quote) quote = null
            } else if (ch === '"' || ch === "'" || ch === '`') quote = ch
            else if (ch === '{') depth++
            else if (ch === '}') {
              depth--
              if (depth === 0) break
            }
          }
          opts = optionNames(src.slice(i + 1, j))
        }
      }
      direct.push({ key, opts, rel, line: src.slice(0, m.index).split('\n').length })
    }

    for (const m of src.matchAll(KEYPROP)) {
      indirect.push({ key: m[3], rel, line: src.slice(0, m.index).split('\n').length, via: m[1] })
    }
    if (rel.endsWith('seo/dashboard-titles.ts')) {
      for (const m of src.matchAll(TITLEKEY)) {
        indirect.push({ key: m[2], rel, line: src.slice(0, m.index).split('\n').length, via: 'key' })
      }
    }
  }
  return { direct, indirect }
}

const { direct, indirect } = collect()

test('i18n: nijedan t() ključ ne pokazuje na nepostojeći ključ ni na imenski prostor', () => {
  const bad = []
  for (const { key, rel, line } of direct) {
    const rb = resolve(BS, key)
    const re = resolve(EN, key)
    if (rb === 'branch' || re === 'branch') {
      bad.push(`${rel}:${line} t('${key}') — ključ je IMENSKI PROSTOR, ispisuje se goli ključ`)
    } else if (rb === 'missing' || re === 'missing') {
      bad.push(`${rel}:${line} t('${key}') — ne postoji (bs=${rb}, en=${re})`)
    }
  }
  assert.deepEqual(
    bad,
    [],
    'Ključ koji ne postoji ili je grana prikazuje se kao goli tekst na ekranu.\n  ' +
      [...new Set(bad)].join('\n  '),
  )
  // pozitivna kontrola: sweep mora stvarno nešto i pročitati
  const uniq = new Set(direct.map((d) => d.key))
  assert.ok(uniq.size > 1500, `sweep je vidio samo ${uniq.size} ključeva — premalo da bi bio dokaz`)
})

test('i18n: nijedan indirektno prenesen ključ (*Key:, key: u dashboard-titles) ne visi', () => {
  const bad = []
  for (const { key, rel, line, via } of indirect) {
    const rb = resolve(BS, key)
    const re = resolve(EN, key)
    if (rb === 'branch' || re === 'branch' || rb === 'missing' || re === 'missing') {
      bad.push(`${rel}:${line} ${via}: '${key}' (bs=${rb}, en=${re})`)
    }
  }
  assert.deepEqual(bad, [], 'Indirektni ključevi:\n  ' + [...new Set(bad)].join('\n  '))
  assert.ok(indirect.length > 50, `sweep je vidio samo ${indirect.length} indirektnih ključeva`)
})

test('i18n: svaka {{interpolacija}} u prijevodu je i prosljeđena u pozivu', () => {
  const bad = []
  for (const { key, opts, rel, line } of direct) {
    const need = new Set([...placeholders(valueOf(BS, key)), ...placeholders(valueOf(EN, key))])
    if (need.size === 0) continue
    if (opts === 'dynamic') continue // izraz umjesto literala — nije statički provjerljivo
    const given = opts ?? new Set()
    const missing = [...need].filter((n) => !given.has(n))
    if (missing.length > 0) {
      bad.push(`${rel}:${line} t('${key}') traži {${[...need].join(', ')}}, a daje {${[...given].join(', ')}}`)
    }
  }
  assert.deepEqual(
    bad,
    [],
    'Neposlata interpolacija prikazuje se doslovno kao {{x}}.\n  ' + [...new Set(bad)].join('\n  '),
  )
  // pozitivna kontrola: analiza opcija stvarno prepoznaje shorthand
  const shorthand = direct.find((d) => d.key === 'clientAnalyticsPage.rating')
  assert.ok(shorthand, 'nije nađen t(\'clientAnalyticsPage.rating\') — uzorak se promijenio')
  assert.deepEqual(
    [...(shorthand.opts ?? [])].sort(),
    ['max', 'rating'],
    'analiza opcija mora čitati shorthand `{ rating, max }` — bez toga ovaj test ' +
      'daje lažne pozitive (desilo se pri prvom pokušaju)',
  )
})

/**
 * ── Test 5: literali koji LIČE na i18n ključ (mape, a ne samo `t()` pozivi) ──
 * Testovi 1–4 čitaju ključ s mjesta gdje se vidi: `t('…')` ili `*Key:`. Ali
 * ključevi se u ovom kodu prenose i kroz **mape**. Primjer izmjeren 2026-11-10:
 * `pages/SettingsSeo.tsx` ima `SEO_FIELD_COPY_KEYS` čije vrijednosti
 * (`'adminSettings.seo.fields.defaultTitle'` …) završe u `t(copyKeys.label)` —
 * dinamički poziv koji test 1 označi kao 'dynamic' i **preskoči**.
 *
 * 🔴 Dokazano mutacijom: ključ u toj mapi promijenjen u nepostojeći prošao je
 * kroz **svih 13** settings-testova (`admin-settings-seo-i18n`,
 * `admin-settings-operations-appearance-i18n`, 6× `admin-settings-site-*-i18n`,
 * `admin-settings-accessibility`, `settings-semantic-tokens`,
 * `settings-hub-redirect`, `admin-settings-controls-a11y`) **i** kroz testove
 * 1–4 iznad. Razlog: postojeći sakupljači traže `\bt\('([^']+)'`, a vrijednost
 * u mapi nije argument od `t()`. Na ekranu bi se prikazao goli ključ.
 *
 * Zato se ovdje provjerava **svaki** string literal u `src/` koji počinje
 * imenskim prostorom iz `bs.json` — mora se razriješiti na list (ili plural) u
 * OBA jezika. Izmjereno: **2449** takvih literala; **7** se ne razrješava na
 * list — 6 su legitimni plurali (`_one`/`_few`/`_other`, što `resolve` već
 * prihvata), a preostali 1 je identifikator backend postavke, ne i18n ključ.
 */
const NAMESPACES = new Set(Object.keys(BS))
const LOOKS_LIKE_KEY = /^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+$/

/**
 * Identifikatori koji izgledaju kao `imenskiProstor.nešto` a **nisu** i18n
 * ključevi. Mora ostati tačno ovaj skup — ako zarđa, test pada (pozitivna
 * kontrola), jer bi svaka nova stavka mogla sakriti stvarni propust.
 *
 * `salon.timezone` je ključ backend postavke (`groups-operations.ts:13` i
 * `SettingsOperations.tsx:22`); `salon` je istovremeno i18n imenski prostor, pa
 * ga heuristika zahvati.
 */
const NOT_I18N_LITERALS = new Set(['salon.timezone'])

/**
 * Vadi sve obične string literale (`'…'` i `"…"`) iz izvora s zakomentarisanim
 * komentarima. Predložci (backtick) se namjerno preskaču: oni s `${…}` su
 * dinamički, a bez njega se u ovom kodu ne koriste za ključeve.
 */
function stringLiterals(src) {
  const out = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === "'" || c === '"') {
      let j = i + 1
      let body = ''
      let closed = false
      while (j < src.length) {
        const ch = src[j]
        if (ch === '\\') {
          body += ch + (src[j + 1] ?? '')
          j += 2
          continue
        }
        if (ch === c) {
          closed = true
          break
        }
        if (ch === '\n') break
        body += ch
        j++
      }
      if (closed) out.push({ body, line: src.slice(0, i).split('\n').length })
      i = closed ? j + 1 : j
      continue
    }
    if (c === '`') {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') {
          j += 2
          continue
        }
        if (src[j] === '`') break
        j++
      }
      i = j + 1
      continue
    }
    i++
  }
  return out
}

function collectNamespaceLiterals() {
  const found = new Map()
  for (const url of walk(SRC)) {
    const rel = decodeURIComponent(url.pathname.replace(new RegExp('^' + SRC.pathname), ''))
    const src = blankComments(readFileSync(url, 'utf8'))
    for (const { body, line } of stringLiterals(src)) {
      if (!LOOKS_LIKE_KEY.test(body)) continue
      if (!NAMESPACES.has(body.split('.')[0])) continue
      if (!found.has(body)) found.set(body, `${rel}:${line}`)
    }
  }
  return found
}

const namespaceLiterals = collectNamespaceLiterals()

test('i18n: svaki literal s imenskim prostorom se razrješava u oba jezika (mape uključene)', () => {
  const bad = []
  const allowlisted = []
  for (const [key, where] of namespaceLiterals) {
    const rb = resolve(BS, key)
    const re = resolve(EN, key)
    const ok = (v) => v === 'leaf' || v === 'plural'
    if (ok(rb) && ok(re)) continue
    if (NOT_I18N_LITERALS.has(key)) {
      allowlisted.push(key)
      continue
    }
    bad.push(`${where} '${key}' (bs=${rb}, en=${re})`)
  }
  assert.deepEqual(
    bad,
    [],
    'Literal koji izgleda kao i18n ključ a ne razrješava se na list prikazuje se kao ' +
      'goli ključ — čak i kad stoji u mapi pa ga `t()` vidi tek u runtime-u.\n  ' +
      bad.join('\n  '),
  )
  // pozitivna kontrola 1: allowlist ne smije zarđati ni u jednom smjeru
  assert.deepEqual(
    [...new Set(allowlisted)].sort(),
    [...NOT_I18N_LITERALS].sort(),
    'NOT_I18N_LITERALS više ne odgovara stvarnim nerasriješenim literalima — ' +
      'ili je stavka zarđala (ukloni je) ili se pojavio novi identifikator ' +
      'koji nije i18n ključ (dodaj je uz obrazloženje)',
  )
  // pozitivna kontrola 2: sweep mora stvarno nešto i pročitati
  assert.ok(
    namespaceLiterals.size > 2000,
    `sweep je vidio samo ${namespaceLiterals.size} literala — premalo da bi bio dokaz`,
  )
  // pozitivna kontrola 3: mape koje su bile slijepa tačka su stvarno pokrivene
  for (const key of [
    'adminSettings.seo.fields.defaultTitle',
    'adminSettings.site.groups.maintenance',
    'adminSettings.appearance.fields.appTitle',
    'adminSettings.operations.fields.timezone',
    'reservations.statuses.PENDING',
    'reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE',
  ]) {
    assert.ok(
      namespaceLiterals.has(key),
      `'${key}' nije viđen — sakupljač literala je prestao čitati mape`,
    )
  }
})

/**
 * ── Test 6: dinamički ključevi iz predloška `t(`a.b.${x}`)` ─────────────────
 * Treći način prijenosa ključa: prefiks je literal, zadnji segment dolazi iz
 * izraza. Ni test 1 (traži `t('…')`) ni test 5 (traži cijele literale) ne vide
 * šta se tu traži, pa je i to slijepa tačka — npr. `EmailSettings.tsx:1040`
 * gradi `emailSettings.templates.types.${item.id}`.
 *
 * Pravilo: **roditelj** interpoliranog segmenta mora biti imenski prostor u oba
 * jezika. Ako literal prije `${` završava tačkom, roditelj je on sam; ako ne
 * završava, interpolacija dopunjava zadnji segment pa se uzima dio do zadnje
 * tačke. Bez toga bi `t(`emailSettings.campaigns.add${Type}`)` lažno prijavio
 * propust — `add` nije ključ, nego početak `addTitle`/`addText`/`addButton`/
 * `addSpacer` (izmjereno: sva četiri postoje u oba jezika).
 */
function collectTemplatePrefixes() {
  const found = new Map()
  let occurrences = 0
  for (const url of walk(SRC)) {
    const rel = decodeURIComponent(url.pathname.replace(new RegExp('^' + SRC.pathname), ''))
    const src = blankComments(readFileSync(url, 'utf8'))
    // 🔴 `[^`]*?` MORA biti lijeno: pohlepna verzija ide do kraja predloška pa se
    //    vrati na ZADNJI `${`, što na `t(`a.b.add${X}${Y}`)` čita prefiks
    //    `a.b.add${X}.` i lažno prijavljuje propust (izmjereno).
    for (const m of src.matchAll(/\bt\(\s*`([^`]*?)\$\{/g)) {
      const raw = m[1]
      const parent = raw.endsWith('.') ? raw.slice(0, -1) : raw.slice(0, raw.lastIndexOf('.'))
      if (parent === '') continue // `t(`${x}`)` — potpuno dinamički, nije provjerljivo
      occurrences++
      if (!found.has(parent)) {
        found.set(parent, `${rel}:${src.slice(0, m.index).split('\n').length}`)
      }
    }
  }
  return { prefixes: found, occurrences }
}

const { prefixes: templatePrefixes, occurrences: templateOccurrences } = collectTemplatePrefixes()

test('i18n: roditelj svakog dinamičkog ključa iz predloška postoji u oba jezika', () => {
  const bad = []
  for (const [parent, where] of templatePrefixes) {
    const rb = resolve(BS, parent)
    const re = resolve(EN, parent)
    if (rb !== 'branch' || re !== 'branch') {
      bad.push(`${where} t(\`${parent}.$\{…}\`) — roditelj bs=${rb}, en=${re}`)
    }
  }
  assert.deepEqual(
    bad,
    [],
    'Prefiks dinamičkog ključa ne postoji — svaki poziv tog oblika ispisuje goli ' +
      'ključ, bez obzira na vrijednost izraza.\n  ' + bad.join('\n  '),
  )
  // pozitivna kontrola: sweep mora stvarno nešto i pročitati
  // Izmjereno 2026-11-10: 34 poziva ovog oblika, 20 različitih roditelja.
  assert.ok(
    templateOccurrences > 30,
    `sweep je vidio samo ${templateOccurrences} poziva — premalo da bi bio dokaz`,
  )
  assert.ok(
    templatePrefixes.size > 15,
    `sweep je vidio samo ${templatePrefixes.size} različitih roditelja — premalo`,
  )
  // pozitivna kontrola: pravilo o roditelju se stvarno primjenjuje na oba oblika
  assert.ok(
    templatePrefixes.has('emailSettings.templates.types'),
    'prefiks s tačkom na kraju (`…types.${item.id}`) nije viđen',
  )
  assert.ok(
    templatePrefixes.has('emailSettings.campaigns'),
    'prefiks bez tačke (`…campaigns.add${Type}`) mora se svesti na roditelja',
  )
})

/**
 * ── Test 7: štit nad mapom kopirnih ključeva u postavkama ────────────────────
 * Test 5 garantuje da **svaki** ključ u `*_COPY_KEYS` mapama postoji. Ali sama
 * mapa nije dovoljna: kod koji je čita mora podnijeti i slučaj da se mapa
 * razdvoji od izvora (`groups-*.ts` dobije novu grupu ili polje).
 *
 * Izmjereno ponašanje bez štita, s instaliranim `i18next@23.16.8`:
 *   - `t(copyKeys.label)` kad `copyKeys === undefined` → **TypeError**
 *     „Cannot read properties of undefined (reading 'label')" = bijeli ekran;
 *   - `t(undefined)` **ne baca** nego vraća **`''`** → prazna labeta, što je tiše
 *     i gore za AT (WCAG 3.3.2 / 4.1.2) jer korisnik dobije polje bez imena.
 *
 * Zato sve četiri stranice moraju imati isti oblik: rani izlaz za grupu i
 * izostavljena labeta (ne prazna) za polje — `setting-editor-display.tsx:22` i
 * `setting-editor-form.tsx:33` već rade `def.label ?? def.desc`, pa izostavljanje
 * pada na postojeći bosanski opis umjesto na prazan string.
 *
 * Do 2026-11-10 štit je imao **samo** `Settings.tsx`; ostale tri stranice su
 * mogle pasti. Usaglašeno uz odobrenje vlasnika.
 */
const SETTINGS_PAGES = [
  '../pages/Settings.tsx',
  '../pages/SettingsOperations.tsx',
  '../pages/SettingsAppearance.tsx',
  '../pages/SettingsSeo.tsx',
]

test('i18n: sve četiri stranice postavki štite mapu kopirnih ključeva', () => {
  for (const rel of SETTINGS_PAGES) {
    const name = rel.replace('../pages/', '')
    const src = readFileSync(new URL(rel, import.meta.url), 'utf8')
    assert.match(
      src,
      /if \(!copyKeys\) return group/,
      `${name}: nema ranog izlaza — nova grupa bez kopirnog ključa baca TypeError ` +
        '(`t(copyKeys.label)` na undefined) i obara cijelu stranicu',
    )
    assert.match(
      src,
      /const fieldKey = [A-Z_]+FIELD_COPY_KEYS\[def\.key as keyof typeof [A-Z_]+FIELD_COPY_KEYS\]/,
      `${name}: ključ polja se mora prvo pročitati u varijablu da bi se mogao provjeriti`,
    )
    assert.match(
      src,
      /\.\.\.\(fieldKey \? \{ label: t\(fieldKey\) \} : \{\}\)/,
      `${name}: labeta se mora IZOSTAVITI kad ključa nema — ` +
        '`t(undefined)` vraća prazan string, a `def.label ?? def.desc` tada pada na prazno',
    )
    assert.doesNotMatch(
      src,
      /label: t\([A-Z_]+FIELD_COPY_KEYS\[/,
      `${name}: vratio se direktan ` +
        '`t(MAPA[def.key])` bez štita — polje bez ključa bi imalo praznu labelu',
    )
  }
})

test('regresija /stylist/workbook: newEntry je imenski prostor, .title je list', () => {
  assert.equal(resolve(BS, 'stylistWorkbook.newEntry'), 'branch',
    'stylistWorkbook.newEntry mora ostati imenski prostor — inače je struktura promijenjena')
  for (const loc of [BS, EN]) {
    assert.equal(typeof loc.stylistWorkbook?.newEntry?.title, 'string')
    assert.ok(loc.stylistWorkbook.newEntry.title.length > 0)
  }
  const src = readFileSync(
    new URL('../features/stylist-workbook/pages/workbook-list-page.tsx', import.meta.url),
    'utf8',
  )
  // goli ključ se ne smije vratiti, ni kao t() ni ikako drugačije
  assert.equal(
    (src.match(/t\('stylistWorkbook\.newEntry'\)/g) || []).length,
    0,
    't(\'stylistWorkbook.newEntry\') se vratilo — to ispisuje goli ključ na /stylist/workbook',
  )
  assert.equal(
    (src.match(/t\('stylistWorkbook\.newEntry\.title'\)/g) || []).length,
    2,
    'oba dugmeta (zaglavlje i prazno stanje) moraju koristiti .title',
  )
})
