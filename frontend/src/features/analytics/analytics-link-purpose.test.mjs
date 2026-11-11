import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// ---------------------------------------------------------------------------
// 2.4.9 — Link Purpose (Link Only)
//
// Axe je na `/admin/analytics` prijavio `identical-links-same-purpose` kao
// **nepotpuno** (run 42985731553): čvor `a[href$="stylists"]`. Uzrok čitan iz izvora:
// tab „Stilisti" ide na `/admin/analytics?tab=stylists`, a stavka u bočnoj traci
// „Stilisti" ide na `/admin/stylists`. Identično ime, različita svrha. Isto za
// „Klijenti" u oba jezika.
//
// Mjera ne vjeruje tom opisu — sama računa imena iz i18n datoteka i izvora.
// ---------------------------------------------------------------------------

const LOCALES = ['bs', 'en']
const locales = Object.fromEntries(
  LOCALES.map((l) => [l, JSON.parse(readFileSync(new URL(`../../i18n/locales/${l}.json`, import.meta.url), 'utf8'))]),
)
const nav = readFileSync(new URL('../shell/admin/admin-nav.ts', import.meta.url), 'utf8')
const tabNav = readFileSync(new URL('./analytics-tab-nav.tsx', import.meta.url), 'utf8')

/** `nav.stylists` → vrijednost iz locale datoteke. */
const resolve = (locale, dotted) =>
  dotted.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), locales[locale])

/**
 * `labelKey`-eve bočne trake čita iz izvora, ne iz nekog popisa — i to **samo one koji su
 * linkovi**. `admin-nav.ts` ima i `labelKey` na naslovima grupa (`nav.sectionSalon`), a
 * naslov grupe nije link pa ni ne može biti u sukobu po 2.4.9. Da se to ne razdvoji, mjera
 * bi prijavila „Pregled" (naslov grupe) kao sukob s tabom „Pregled" — lažni pozitivni.
 */

const sidebarLabelKeys = [...nav.matchAll(/\{\s*path:\s*'[^']+',\s*labelKey:\s*'(nav\.[A-Za-z.]+)'/g)].map(
  (m) => m[1],
)

/** Koliko linkova izvor stvarno ima — mjera sama sebi provjerava opseg. */
const sidebarPathCount = (nav.match(/path:\s*'/g) || []).length

/** Ključevi tabova čitaju se iz izvora, da novi tab ne prođe neprimijećen. */
const tabBlock = tabNav.slice(tabNav.indexOf('ANALYTICS_TABS = ['), tabNav.indexOf(']', tabNav.indexOf('ANALYTICS_TABS = [')))
const tabs = [...tabBlock.matchAll(/'([a-z]+)'/g)].map((m) => m[1])

/** Ime kakvo ga čita AT: aria-label ako postoji, inače vidljivi tekst. */
const tabAccessibleName = (locale, tab) => {
  const visible = resolve(locale, `adminAnalytics.tabs.${tab}`)
  const context = resolve(locale, 'adminAnalytics.tabContext')
  return `${visible} — ${context}`
}

test('nijedan tab analitike nema ime identično stavci u bočnoj traci (2.4.9)', () => {
  assert.ok(sidebarLabelKeys.length >= 13, `očekivan pun popis linkova bočne trake, dobijeno ${sidebarLabelKeys.length}`)
  // Samoprovjera opsega: četiri linka u `admin-nav.ts` imaju i polja `tab`/`tabDefault`, pa
  // obrazac koji traži `}` odmah za `labelKey`-om tiho preskače upravo njih.
  assert.equal(
    sidebarLabelKeys.length,
    sidebarPathCount,
    `mjera hvata ${sidebarLabelKeys.length} od ${sidebarPathCount} linkova bočne trake`,
  )
  assert.deepEqual(tabs, ['overview', 'clients', 'stylists'], 'tabovi pročitani iz izvora')

  for (const locale of LOCALES) {
    const sidebar = new Map(
      sidebarLabelKeys.map((key) => [resolve(locale, key), key]).filter(([label]) => typeof label === 'string'),
    )
    assert.ok(sidebar.size >= 12, `${locale}: bočna traka mora imati imena, dobijeno ${sidebar.size}`)

    // Presuđuje **pristupačno ime**, ne vidljivi tekst: vidljivi tekst taba namjerno ostaje
    // kratak, a kontekst nosi `aria-label`. Bez tog `aria-label`-a ovo pada — i to je poanta.
    const clashes = tabs.filter((tab) => sidebar.has(tabAccessibleName(locale, tab)))
    assert.deepEqual(
      clashes,
      [],
      `${locale}: tab i bočna traka dijele pristupačno ime pa 2.4.9 ne zna kamo link vodi (${clashes.join(', ')})`,
    )

    // Samoprovjera mjere: da `aria-label` nije dodan, sukob BI morao biti prijavljen.
    // Inače bi test prolazio i kad kontekst nestane.
    const bezKonteksta = tabs.filter((tab) => sidebar.has(resolve(locale, `adminAnalytics.tabs.${tab}`)))
    assert.ok(
      bezKonteksta.length > 0,
      `${locale}: bez konteksta u imenu nema nijednog sukoba, pa mjera ne bi uhvatila regresiju`,
    )
  }
})

test('vidljivi tekst taba je doslovno prefiks njegovog imena (2.5.3)', () => {
  for (const locale of LOCALES) {
    for (const tab of tabs) {
      const visible = resolve(locale, `adminAnalytics.tabs.${tab}`)
      const name = tabAccessibleName(locale, tab)
      assert.ok(name.startsWith(visible), `${locale}/${tab}: „${name}" ne počinje s „${visible}"`)
      assert.ok(name.length > visible.length, `${locale}/${tab}: ime mora nositi i kontekst`)
    }
  }
})

test('popravka se ne može tiho ukloniti iz izvora (2.4.9)', () => {
  assert.match(tabNav, /aria-label=\{tabLabel\(tab\)\}/, 'tab mora imati aria-label')
  assert.match(tabNav, /export const analyticsTabName = \(tab: AnalyticsTab, t:/)
  assert.match(
    tabNav,
    /t\('adminAnalytics\.tabContext'\)/,
    'kontekst mora dolaziti iz i18n ključa, ne biti hardkodovan',
  )
  // Tijelo `analyticsTabName` — ne samo postojanje ključa. Bez ove provjere funkcija može
  // vratiti samo vidljivi tekst, ključ i dalje postoji u i18n, i 2.4.9 se tiho vrati.
  const tijelo = tabNav.slice(tabNav.indexOf('export const analyticsTabName'))
  assert.match(tijelo, /analyticsTabContext\(t\)/, 'ime taba mora stvarno sadržavati kontekst')
  for (const locale of LOCALES) {
    assert.ok(
      typeof resolve(locale, 'adminAnalytics.tabContext') === 'string',
      `${locale}: adminAnalytics.tabContext mora postojati`,
    )
  }
})
