import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { getRegistrationErrorKey } from '../features/auth/registration-error.mjs'
import { resolveClientReservationError } from '../features/client-reservations/client-reservation-error.mjs'
import { resolveProfileApiErrorKey } from '../features/profile/profile-api-error.mjs'
import { resolvePublicReservationError } from '../features/reservations/public-reservation-error.mjs'

/**
 * Guard: serverske poruke koje frontend **prevodi** moraju ostati prevodive.
 *
 * ── Zašto ovo postoji ────────────────────────────────────────────────────────
 * Backend nema funkcionalan i18n sloj ni sloj kodova grešaka. Izmjereno
 * 2026-11-10: **0** pogodaka za `nestjs-i18n`, `I18nService`, `Accept-Language`,
 * `errorCode` u `backend/src` + `backend/package.json`. Postoji `backend/src/
 * i18n/constants.ts`, ali je **mrtav kod** — 0 uvoznika, samo BS, a sâm
 * komentar kaže „Za budući engleski (EN) dodati prevode i odabir locale".
 * Uz to: **429** `…Exception('…')` poziva s literalnom porukom, od kojih **413**
 * nosi bosanski tekst (**191** različitih poruka). Pet modula na frontendu zato
 * mapira **tačnu bosansku poruku** → i18n ključ:
 *
 *   `features/admin/admin-api-error.mjs`                        30 parova
 *   `features/auth/registration-error.mjs`                       3 para
 *   `features/profile/profile-api-error.mjs`                    14 parova
 *   `features/client-reservations/client-reservation-error.mjs` 10 parova
 *   `features/reservations/public-reservation-error.mjs`         7 parova
 *
 * Taj ugovor je **krhak na dva načina**, a nijedan postojeći test ga nije čuvao:
 *
 * 1. **Drift.** Ako se poruka u backendu promijeni i za jedan znak, `Map.get()`
 *    promaši i korisnik umjesto konkretnog razloga dobije generički fallback.
 *    Tiho, bez greške, bez pada ijednog drugog testa.
 * 2. **Ključ bez prijevoda.** Dva modula vraćaju **kratke** ključeve
 *    (`errorSlotUnavailable`, `errorCancelDeadline`, …) koje pozivatelj tek
 *    prefiksira (`MyReservations.tsx:46` → `public.myReservations.`,
 *    `PublicReserve.tsx:766` → `public.reserve.`). Bez tačke u sebi, ti ključevi
 *    su **nevidljivi** za `i18n-key-resolution` test 5 (koji traži literale s
 *    imenskim prostorom) — tipfeler bi se prikazao kao goli ključ na javnoj
 *    stranici za rezervaciju.
 *
 * Postojećih 5 testova (`test:admin-api-errors`, `test:registration-errors`,
 * `test:profile-api-errors`, `test:client-reservation-errors`,
 * `test:reservation-errors`) provjerava **logiku mapiranja**, ali nijedan ne čita
 * `locales/*.json` niti `backend/` — izmjereno: 0 pogodaka za `locales/bs.json` u
 * svih pet.
 *
 * ── Izmjereno stanje na dan pisanja (sve čisto) ──────────────────────────────
 * 64 para (**55** različitih poruka → **58** različitih ključeva): svih 64 poruke
 * postoje doslovno u `backend/src` (314 fajlova), svih 58 ključeva razrješava se na
 * list u **oba** jezika, 0 neslaganja interpolacije. Ovaj test taj status
 * **zaključava**. 15 od 55 poruka nije u uskom `Exception('…')` jednom linijskom
 * obliku — žive u višelinijskim `throw` pozivima i u DTO dekoratorima
 * (`@MinLength(8, { message: … })`), pa ih test nalazi pretragom po tekstu fajla,
 * ne po obliku poziva.
 *
 * ── Šta ovo NE rješava ───────────────────────────────────────────────────────
 * Unutar izmjerenog skupa od **191** jednolinijskih `Exception('…')` poruka mapirano je
 * **40**, a **151** nije — nemapirane padaju na generički fallback (preveden, ali bez
 * konkretnog razloga). Ostalih 15 mapiranih poruka živi u višelinijskim `throw` pozivima
 * i DTO dekoratorima. To je stavka `I18N-01`
 * (`docs/audit/FINDINGS.md:532`, „API-error audit") i traži arhitektonsku odluku
 * (kodovi grešaka ili backend i18n), ne ovaj test.
 */

const BACKEND_SRC = new URL('../../../backend/src/', import.meta.url)
const PLURAL = ['_zero', '_one', '_two', '_few', '_many', '_other']
const SENTINEL = '__nije_mapirano__'

/** Vadi parove `['poruka', 'ključ']` iz `new Map([...])`, uključujući višelinijske. */
const PAIR = /\[\s*'((?:[^'\\]|\\.)*)'\s*,\s*'([^']*)'\s*,?\s*\]/g

function loadLocale(loc) {
  return JSON.parse(readFileSync(new URL(`../i18n/locales/${loc}.json`, import.meta.url), 'utf8'))
}
const BS = loadLocale('bs')
const EN = loadLocale('en')

function walk(root, key) {
  let cur = root
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return undefined
    cur = cur[part]
  }
  return cur
}

/** 'leaf' | 'plural' | 'branch' | 'missing' */
function resolve(root, key) {
  const cur = walk(root, key)
  if (typeof cur === 'string') return 'leaf'
  if (cur !== null && typeof cur === 'object') {
    return PLURAL.some((s) => typeof cur[s] === 'string') ? 'plural' : 'branch'
  }
  return 'missing'
}

/** Svi stringovi ispod ključa (za list — sam, za plural — svaka varijanta). */
function stringsUnder(root, key) {
  const cur = walk(root, key)
  if (typeof cur === 'string') return [cur]
  if (cur !== null && typeof cur === 'object') {
    return Object.values(cur).filter((v) => typeof v === 'string')
  }
  return []
}

function placeholdersOf(root, key) {
  const out = new Set()
  for (const s of stringsUnder(root, key)) {
    for (const m of s.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) out.add(m[1])
  }
  return out
}

function backendCorpus() {
  const out = []
  // `readdirSync` s `withFileTypes`: `statSync` nad symlink-om zna dati ENOTDIR.
  const walkDir = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.isDirectory()) walkDir(new URL(`${ent.name}/`, dir))
      else if (ent.name.endsWith('.ts') && !ent.name.includes('.spec.')) {
        out.push(readFileSync(new URL(ent.name, dir), 'utf8'))
      }
    }
  }
  walkDir(BACKEND_SRC)
  return out.join('\n')
}

const MODULES = [
  {
    label: 'admin-api-error',
    file: '../features/admin/admin-api-error.mjs',
    prefix: '',
    expectedPairs: 30,
    // modul vraća **string** (ključ), ne objekt
    resolve: (message) => ({ key: resolveAdminApiErrorKey(message, SENTINEL) }),
    // `Rola <ime> nije pronađena.` je regex grana (`admin-api-error.mjs`), ne par u mapi
    probes: [{ message: 'Rola Frizer nije pronađena.' }],
  },
  {
    label: 'registration-error',
    file: '../features/auth/registration-error.mjs',
    prefix: '',
    expectedPairs: 3,
    resolve: (message) => ({ key: getRegistrationErrorKey(message) }),
    // fallback je hardkodiran OVDJE, pa i on mora postojati
    hardcodedFallback: 'auth.registrationError',
    probes: [],
  },
  {
    label: 'profile-api-error',
    file: '../features/profile/profile-api-error.mjs',
    prefix: '',
    expectedPairs: 14,
    resolve: (message) => ({ key: resolveProfileApiErrorKey(message, SENTINEL) }),
    probes: [],
  },
  {
    label: 'client-reservation-error',
    file: '../features/client-reservations/client-reservation-error.mjs',
    prefix: 'public.myReservations.',
    expectedPairs: 10,
    resolve: (message) => {
      const r = resolveClientReservationError(message)
      return r ? { key: r.key } : SENTINEL
    },
    probes: [
      {
        message: 'Rok za potvrdu dolaska je istekao (najkasnije 12h prije termina).',
        values: { hours: '12' },
      },
    ],
  },
  {
    label: 'public-reservation-error',
    file: '../features/reservations/public-reservation-error.mjs',
    prefix: 'public.reserve.',
    expectedPairs: 7,
    resolve: (message) => {
      const r = resolvePublicReservationError(message)
      return r ? { key: r.key, values: r.values } : SENTINEL
    },
    probes: [
      {
        message: 'Već imate rezervaciju u tom periodu (09:00–10:30).',
        values: { start: '09:00', end: '10:30' },
      },
      {
        message: 'Već imate rezervaciju za Šišanje na odabrani dan.',
        values: { service: 'Šišanje' },
      },
      {
        message: 'Zbog čestih otkazivanja rezervacija je onemogućena do 2026-12-05.',
        values: { date: '2026-12-05' },
      },
    ],
  },
]

function pairsOf(mod) {
  const src = readFileSync(new URL(mod.file, import.meta.url), 'utf8')
  return [...src.matchAll(PAIR)].map((m) => ({ message: m[1], key: m[2] }))
}

test('i18n: svaka bosanska poruka iz mape još postoji doslovno u backendu (drift)', () => {
  const corpus = backendCorpus()
  // pozitivna kontrola: korpus mora biti stvarno učitan, inače sve „prođe"
  assert.ok(corpus.length > 500_000, `backend korpus je samo ${corpus.length} znakova — nije učitan`)

  const stale = []
  for (const mod of MODULES) {
    for (const { message } of pairsOf(mod)) {
      if (!corpus.includes(message)) stale.push(`${mod.label}: ${JSON.stringify(message)}`)
    }
  }
  assert.deepEqual(
    stale,
    [],
    'Backend poruka se promijenila, pa Map.get() promašuje i korisnik umjesto ' +
      'konkretnog razloga dobija generički fallback — tiho, bez pada ijednog drugog testa.\n  ' +
      stale.join('\n  '),
  )
})

test('i18n: svaki ključ koji mapa vrati postoji u oba jezika', () => {
  const bad = []
  for (const mod of MODULES) {
    for (const { message, key } of pairsOf(mod)) {
      const got = mod.resolve(message)
      if (got === SENTINEL) {
        bad.push(`${mod.label}: poruka ${JSON.stringify(message)} se ne mapira na '${key}'`)
        continue
      }
      const full = mod.prefix + got.key
      const rb = resolve(BS, full)
      const re = resolve(EN, full)
      const isLeaf = (k) => k === 'leaf' || k === 'plural'
      if (!isLeaf(rb) || !isLeaf(re)) {
        bad.push(`${mod.label}: '${full}' (bs=${rb}, en=${re}) — prikazao bi se goli ključ`)
      }
      if (got.key !== key) {
        bad.push(`${mod.label}: mapa kaže '${key}', a kod vraća '${got.key}'`)
      }
    }
    if (mod.hardcodedFallback) {
      const fb = mod.hardcodedFallback
      if (resolve(BS, fb) !== 'leaf' || resolve(EN, fb) !== 'leaf') {
        bad.push(`${mod.label}: hardkodirani fallback '${fb}' ne postoji u oba jezika`)
      }
    }
  }
  assert.deepEqual(bad, [], 'Ključevi iz mapa za serverske greške:\n  ' + bad.join('\n  '))
})

test('i18n: dinamičke (regex) grane vraćaju ključ koji postoji i ima tačnu interpolaciju', () => {
  const bad = []
  for (const mod of MODULES) {
    for (const probe of mod.probes) {
      const got = mod.resolve(probe.message)
      if (got === SENTINEL) {
        bad.push(`${mod.label}: '${probe.message}' se ne prepoznaje — regex grana je pukla`)
        continue
      }
      const full = mod.prefix + got.key
      const need = new Set([...placeholdersOf(BS, full), ...placeholdersOf(EN, full)])
      const given = new Set(Object.keys(probe.values ?? {}))
      if (resolve(BS, full) === 'missing' || resolve(EN, full) === 'missing') {
        bad.push(`${mod.label}: dinamički ključ '${full}' ne postoji u oba jezika`)
      }
      for (const n of need) {
        if (!given.has(n)) {
          bad.push(`${mod.label}: '${full}' traži {{${n}}}, a dobija {${[...given].join(', ') || '—'}}`)
        }
      }
      for (const g of given) {
        if (!need.has(g)) bad.push(`${mod.label}: '${full}' ne traži {{${g}}}, a šalje se`)
      }
    }
  }
  assert.deepEqual(bad, [], 'Dinamičke grane:\n  ' + bad.join('\n  '))
})

test('pozitivne kontrole: broj parova, nepoznata poruka i stvarno izvršen kod', () => {
  for (const mod of MODULES) {
    const pairs = pairsOf(mod)
    assert.equal(
      pairs.length,
      mod.expectedPairs,
      `${mod.label}: očekivano ${mod.expectedPairs} parova, nađeno ${pairs.length} — ` +
        'ili je mapa promijenjena (ažuriraj broj) ili je sakupljač parova pokvaren',
    )
  }
  // nepoznata poruka MORA pasti na fallback/null — bez toga „mapira sve" nije dokaz
  assert.equal(resolveAdminApiErrorKey('Nepoznata serverska poruka.', SENTINEL), SENTINEL)
  assert.equal(resolveAdminApiErrorKey('Rola Frizer nije pronađena.', SENTINEL), 'users.errors.roleNotFound')
  assert.equal(getRegistrationErrorKey('Nepoznata serverska poruka.'), 'auth.registrationError')
  assert.equal(resolveProfileApiErrorKey('Nepoznata serverska poruka.', SENTINEL), SENTINEL)
  assert.equal(resolveClientReservationError('Nepoznata serverska poruka.'), null)
  assert.equal(resolvePublicReservationError('Nepoznata serverska poruka.'), null)
  // i stvarno preslikavanje radi — da test ne „prolazi" na praznoj logici
  assert.equal(resolveAdminApiErrorKey('Korisnik nije pronađen.', SENTINEL), 'users.errors.notFound')
  assert.deepEqual(resolvePublicReservationError('SERVICE_REQUIRED'), { key: 'errorServiceRequired' })
})
