import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// ---------------------------------------------------------------------------
// 2.4.9 — Link Purpose (Link Only)
//
// Axe je na `/admin/analytics` prijavio `identical-links-same-purpose` kao
// **nepotpuno** (run 42985731553): čvor `a[href$="stylists"]`. Uzrok čitan iz izvora:
// pod-pogled analitike „Stilisti" ide na `/admin/analytics?tab=stylists`, a stavka u
// bočnoj traci „Stilisti" ide na `/admin/stylists`. Identično ime, različita svrha.
// Isto za „Klijenti" u oba jezika.
//
// S8 (2026-11-18): uzrok je uklonjen u korijenu — bočna traka više NE DUPIRA
// pod-poglede analitike. Analitika je jedna stavka (`/admin/analytics`), a tri
// pogleda (Pregled / Klijenti / Stilisti) žive u tablistu hub-a, isto kao
// sedam tabova postavki (`/admin/settings`). Zato:
//   1. svaka stavka trake ima jedinstveno pristupačno ime, i
//   2. nijedne dvije stavke nemaju isti cilj.
// Hardkodirani kontekst u `aria-label` više nije potreban — vidljivi tekst
// stavke je i njen pristupačni naziv.
// ---------------------------------------------------------------------------

const LOCALES = ['bs', 'en']
const locales = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(new URL(`../../i18n/locales/${l}.json`, import.meta.url), 'utf8'))]),
)
const nav = readFileSync(new URL('../shell/admin/admin-nav.ts', import.meta.url), 'utf8')
const menu = readFileSync(new URL('../shell/admin/admin-nav-menu.tsx', import.meta.url), 'utf8')

/** `nav.stylists` → vrijednost iz locale datoteke. */
const resolve = (locale, dotted) =>
  dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), locales[locale])

/**
 * Svaki link bočne trake čita se iz izvora (labelKey), ne iz nekog popisa.
 * Naslovi grupa (`nav.sectionSalon`) nemaju `path:`, pa nisu linkovi i ne ulaze
 * u provjeru.
 */
const itemRe = /\{\s*path:\s*'([^']+)',\s*labelKey:\s*'([^']+)'\s*\}/g
const sidebarItems = [...nav.matchAll(itemRe)].map((m) => ({ path: m[1], labelKey: m[2] }))

/** Pristupačno ime: vidljivi tekst stavke. */
const accessibleName = (locale, item) => resolve(locale, item.labelKey)

test('nijedan link bočne trake nema ime identično drugom linku (2.4.9)', () => {
  assert.ok(sidebarItems.length >= 13, `očekivan pun popis linkova bočne trake, dobijeno ${sidebarItems.length}`)
  // Samoprovjera opsega: broj uhvaćenih stavki mora biti jednak broju `path:` u izvoru.
  const pathCount = (nav.match(/path:\s*'/g) || []).length
  assert.equal(sidebarItems.length, pathCount, `mjera hvata ${sidebarItems.length} od ${pathCount} linkova bočne trake`)

  for (const locale of LOCALES) {
    const names = sidebarItems.map((item) => accessibleName(locale, item)).filter((n) => typeof n === 'string')
    assert.ok(names.length >= 12, `${locale}: bočna traka mora imati imena, dobijeno ${names.length}`)
    const seen = new Map()
    for (const name of names) {
      assert.ok(!seen.has(name), `${locale}: duplikat pristupačnog imena „${name}" krši 2.4.9`)
      seen.set(name, true)
    }
  }
})

test('nijedne dvije stavke ne vode na isti cilj', () => {
  const paths = sidebarItems.map((item) => item.path)
  assert.equal(new Set(paths).size, paths.length, `duplikat cilja u bočnoj traci: ${paths.join(', ')}`)
  // Pod-pogledi se ne dupliraju kao `?tab=` stavke (analitika i postavke su
  // jedan link po hub-u).
  assert.doesNotMatch(nav, /tab: '/)
})

test('bočna traka ne duplira pod-poglede analitike (S8)', () => {
  // Tri analitička pod-pogleda postoje samo kao tabovi u hub-u.
  for (const tab of ['overview', 'clients', 'stylists']) {
    assert.ok(
      !sidebarItems.some((item) => item.labelKey === `adminAnalytics.tabs.${tab}`),
      `pod-pogled ${tab} ne smije biti stavka bočne trake`,
    )
  }
  // Zato mehanizam ručnog konteksta u `aria-label` više ne postoji.
  assert.doesNotMatch(nav, /ariaLabelKey/)
  assert.doesNotMatch(menu, /ariaLabelKey/)
  assert.doesNotMatch(menu, /aria-label=\{ariaLabel\}/)
  assert.match(menu, /\{t\(item\.labelKey\)\}/)
})

test('svaka stavka ima prevod u oba jezika', () => {
  for (const locale of LOCALES) {
    for (const item of sidebarItems) {
      const name = resolve(locale, item.labelKey)
      assert.equal(typeof name, 'string', `${locale}: nedostaje prevod za ${item.labelKey}`)
      assert.ok(name.length > 0, `${locale}: prazan naziv stavke ${item.labelKey}`)
    }
  }
})
