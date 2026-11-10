import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import i18next from 'i18next'

import { resolveApiErrorDescription } from './api-error-description.mjs'

/**
 * Ponašanje opisa u `toastApiError`: prevedeno / sirovo samo na bosanskom / izostavljeno
 * na engleskom. Ovo je **bihevioralni** test nad čistim modulom, ne grep nad izvorom —
 * `useAppToast.ts` samo prosljeđuje `getErrorMessage(err, '')`, `i18n.language` i `t`.
 *
 * Zašto postoji: serverske poruke su bosanske, a backend nema i18n sloj. Prije ove
 * izmjene `toast.error(fallback, { description: getErrorMessage(err, fallback) })` je
 * na svih **37** poziva prikazivalo sirovu poruku kao vidljiv tekst (sonner je ubacuje u
 * `<div data-description>`), što je za EN korisnika WCAG 3.1.2 (Language of Parts).
 */

const locales = ['bs', 'en']
const resources = Object.fromEntries(
  locales.map((lng) => [
    lng,
    {
      translation: JSON.parse(
        readFileSync(new URL(`../../i18n/locales/${lng}.json`, import.meta.url), 'utf8'),
      ),
    },
  ]),
)

/** Pravi i18next, kao u aplikaciji — da se provjeri i interpolacija, ne samo ključ. */
async function translator(lng) {
  const i = i18next.createInstance()
  await i.init({ lng, resources, interpolation: { escapeValue: false } })
  assert.equal(i.language, lng)
  return (key, values) => i.t(key, values)
}

const MAPPED = 'Nedovoljno bodova.'
// Ovoj poruci se BS prijevod **razlikuje** od backend teksta ('Odabrana uloga nije
// pronađena.'), pa jedino ona može dokazati da je tekst prošao kroz `t()` — kod ostalih
// je bosanski prijevod namjerno jednak serverskoj poruci, pa bi poređenje bilo prazno.
const MAPPED_DIFFERENT = 'Rola Frizer nije pronađena.'
const MAPPED_INTERPOLATED = 'Preklapanje sa drugim terminom (09:00–10:30).'
const UNMAPPED = 'Ovo je potpuno nepoznata serverska poruka.'

test('mapirana poruka se prevodi u oba jezika (ne prikazuje se sirova)', async () => {
  for (const lng of locales) {
    const t = await translator(lng)
    assert.equal(
      resolveApiErrorDescription(MAPPED, lng, t),
      t('loyaltyAdmin.errors.insufficientPoints'),
    )
    const diff = resolveApiErrorDescription(MAPPED_DIFFERENT, lng, t)
    assert.equal(diff, t('users.errors.roleNotFound'))
    assert.notEqual(
      diff,
      MAPPED_DIFFERENT,
      `${lng}: vratila se sirova serverska poruka umjesto prijevoda`,
    )
  }
  // i da su prijevodi stvarno različiti — inače "prevod" nije dokazan
  const bs = await translator('bs')
  const en = await translator('en')
  assert.notEqual(
    resolveApiErrorDescription(MAPPED_DIFFERENT, 'bs', bs),
    resolveApiErrorDescription(MAPPED_DIFFERENT, 'en', en),
  )
})

test('mapirana poruka s interpolacijom dobija vrijednosti, ne doslovno {{start}}', async () => {
  for (const lng of locales) {
    const t = await translator(lng)
    const got = resolveApiErrorDescription(MAPPED_INTERPOLATED, lng, t) ?? ''
    assert.ok(got.includes('09:00'), `${lng}: nema početka u '${got}'`)
    assert.ok(got.includes('10:30'), `${lng}: nema kraja u '${got}'`)
    assert.ok(!got.includes('{{'), `${lng}: ostala je doslovna interpolacija u '${got}'`)
  }
})

test('nemapirana poruka: na bosanskom ostaje sirova, na engleskom se izostavlja', async () => {
  const bs = await translator('bs')
  const en = await translator('en')
  assert.equal(
    resolveApiErrorDescription(UNMAPPED, 'bs', bs),
    UNMAPPED,
    'Na bosanskom sirova poruka je na jeziku korisnika i nosi konkretan razlog',
  )
  assert.equal(
    resolveApiErrorDescription(UNMAPPED, 'en', en),
    undefined,
    'Na engleskom neprevedena bosanska rečenica ne smije u DOM (WCAG 3.1.2)',
  )
})

test('prazna ili nepostojeća poruka ne daje opis ni na jednom jeziku', async () => {
  for (const lng of locales) {
    const t = await translator(lng)
    for (const raw of ['', undefined, null, 0, {}, ['a']]) {
      assert.equal(
        resolveApiErrorDescription(raw, lng, t),
        undefined,
        `${lng}: raw=${JSON.stringify(raw) ?? String(raw)} nije dalo undefined`,
      )
    }
  }
})

test('pozitivne kontrole: modul stvarno razlikuje mapirano od nemapiranog', async () => {
  const bs = await translator('bs')
  // Da je mapa prazna ili resolver pokvaren, MAPPED bi se ponašao kao UNMAPPED.
  assert.notEqual(resolveApiErrorDescription(MAPPED_DIFFERENT, 'bs', bs), MAPPED_DIFFERENT)
  assert.equal(resolveApiErrorDescription(UNMAPPED, 'bs', bs), UNMAPPED)
  // i obrnuto: na engleskom mapirano daje tekst, nemapirano ne daje ništa
  const en = await translator('en')
  assert.ok(typeof resolveApiErrorDescription(MAPPED, 'en', en) === 'string')
  assert.equal(resolveApiErrorDescription(UNMAPPED, 'en', en), undefined)
})
