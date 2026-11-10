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
