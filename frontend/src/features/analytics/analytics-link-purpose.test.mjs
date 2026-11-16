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
// M1/Q7: pod-pogledi su od S6 grupisani u bočnu traku (grupa „Analitika") umjesto kao
// zaseban tab-menu na vrhu stranice. Kontekst se nosi kroz `ariaLabelKey` na stavci —
// vidljivi tekst ostaje kratak (npr. „Stilisti"), a pristupačno ime postaje
// „Stilisti — analitika". Mjera sama računa imena iz i18n datoteka i izvora.
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
 * Svaki link bočne trake čita se iz izvora (labelKey + opcioni ariaLabelKey), ne iz
 * nekog popisa. Naslovi grupa (`nav.sectionSalon`) nemaju `path:`, pa nisu linkovi i
 * ne ulaze u provjeru. Obrazac hvata i stavke s `tab`/`tabDefault` i one s `ariaLabelKey`.
 */
const itemRe =
  /\{\s*path:\s*'[^']+',\s*labelKey:\s*'([^']+)'(?:\s*,\s*tab:\s*'[^']+')?(?:\s*,\s*tabDefault:\s*true)?(?:\s*,\s*ariaLabelKey:\s*'([^']+)')?\s*\}/g
const sidebarItems = [...nav.matchAll(itemRe)].map((m) => ({ labelKey: m[1], ariaLabelKey: m[2] }))

/** Pristupačno ime: aria-label ako postoji, inače vidljivi tekst. */
const accessibleName = (locale, item) => {
  const visible = resolve(locale, item.labelKey)
  if (!item.ariaLabelKey) return visible
  return `${visible} — ${resolve(locale, item.ariaLabelKey)}`
}

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

test('analitički pod-pogledi imaju kontekst u pristupačnom imenu (2.4.9)', () => {
  for (const locale of LOCALES) {
    for (const tab of ['overview', 'clients', 'stylists']) {
      const item = sidebarItems.find((i) => i.labelKey === `adminAnalytics.tabs.${tab}`)
      assert.ok(item, `${locale}: nedostaje stavka analitike za ${tab}`)
      assert.equal(item.ariaLabelKey, 'adminAnalytics.tabContext', `${locale}/${tab}: stavka mora nositi kontekst`)
      const name = accessibleName(locale, item)
      const visible = resolve(locale, `adminAnalytics.tabs.${tab}`)
      // vidljivi tekst je doslovno prefiks imena (2.5.3 Label in Name)
      assert.ok(name.startsWith(visible), `${locale}/${tab}: „${name}" ne počinje s „${visible}"`)
      assert.ok(name.length > visible.length, `${locale}/${tab}: ime mora nositi i kontekst`)
      // kontekst stvarno mijenja ime u odnosu na goli tekst
      assert.notEqual(name, visible, `${locale}/${tab}: kontekst se ne primjenjuje`)
    }
  }
})

test('popravka se ne može tiho ukloniti iz izvora (2.4.9)', () => {
  // sidebar nosi kontekst
  assert.match(nav, /ariaLabelKey: 'adminAnalytics\.tabContext'/, 'stavke analitike moraju nositi ariaLabelKey')
  // meni gradi aria-label iz ariaLabelKey
  assert.match(menu, /aria-label=\{ariaLabel\}/, 'link mora imati aria-label')
  assert.match(menu, /item\.ariaLabelKey/, 'meni mora čitati ariaLabelKey')
  assert.match(menu, /t\(item\.ariaLabelKey\)/, 'kontekst mora dolaziti iz i18n ključa, ne biti hardkodovan')
  for (const locale of LOCALES) {
    assert.ok(
      typeof resolve(locale, 'adminAnalytics.tabContext') === 'string',
      `${locale}: adminAnalytics.tabContext mora postojati`,
    )
  }
})
