import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const salonPage = read('../../pages/Salon.tsx')
const holidayDialog = read('./holiday-dialog.tsx')
const salonHoursTable = read('./salon-working-hours-table.tsx')
const salonHolidayTable = read('./salon-holiday-table.tsx')
for (const component of ['HolidayDialog', 'SalonWorkingHoursTable', 'SalonHolidayTable', 'CreateSalonForm', 'SalonSettingsForm']) {
  assert.match(salonPage, new RegExp(`<${component}\\b`))
}
const salon = [salonPage, holidayDialog, salonHoursTable, salonHolidayTable].join('\n')
const servicesPage = read('../../pages/Services.tsx')
const serviceTable = read('../services/service-table.tsx')
const serviceCatalog = read('../services/service-catalog.tsx')
assert.match(servicesPage, /<ServiceCatalog\b/)
assert.match(serviceCatalog, /<ServiceTable\b/)
const editor = read('../services/service-editor-dialog.tsx')
const categoryFields = read('../services/category-fields.tsx')
const serviceFields = read('../services/service-fields.tsx')
// Include extracted components; assert the rendering chain as well as the
// original switch, file-picker and table guarantees below.
assert.match(servicesPage, /<ServiceEditorDialog\b/)
assert.match(servicesPage, /useServiceEditor\(\{ loadData, showApiError \}\)/)
assert.match(servicesPage, /useServiceDeletion\(\{ categories, loadData, showApiError \}\)/)
assert.match(servicesPage, /useServiceCatalog\(\{ showApiError \}\)/)
assert.match(editor, /<CategoryFields\b/)
assert.match(editor, /<ServiceFields\b/)
const services = [servicesPage, serviceCatalog, serviceTable, editor, categoryFields, serviceFields].join('\n')
const stylistsPage = read('../../pages/Stylists.tsx')
const stylistEditor = read('./stylist-editor-dialog.tsx')
const stylistWorkingHours = read('./stylist-working-hours.tsx')
assert.match(stylistEditor, /<StylistWorkingHours\b/)
assert.match(stylistsPage, /<StylistEditorDialog\b/)
const stylistManagement = read('./use-stylist-management.ts')
const stylistEditorHook = read('./use-stylist-editor.ts')
assert.match(stylistsPage, /useStylistManagement\(\)/)
assert.match(stylistManagement, /useStylistEditor\(loadData\)/)
const stylists = [stylistsPage, stylistEditor, stylistWorkingHours].join('\n')
const css = read('../../index.css')
const runtimeCss = read('../../styles/globals.css')

// ---------------------------------------------------------------------------
// Faza 8 — Salon / Usluge / Frizeri (2839 linija, do sada 0 testova)
//
// 4.1.2: 8 <Switch> i 4 <Input type="time"> bez ijednog pristupačnog imena.
// 1.3.1: 5 tabela, 27 <th>, 0 scope, 0 <caption>.
// 1.4.10: nijedna tabela nije imala data-table klasu ni data-label.
// ---------------------------------------------------------------------------

const headers = (src) => src.match(/<th\b[^>]*>/g) || []
const cells = (src) => src.match(/<td\b[^>]*>/g) || []
const named = (arr) => arr.filter((t) => /data-label=\{t\(/.test(t))

test('katalog zadržava naslov i ima status učitavanja i oporavljivu grešku', () => {
  const hook = read('../services/use-service-catalog.ts')
  assert.match(servicesPage, /<h1\b[\s\S]*?t\('nav\.services'\)/)
  assert.match(servicesPage, /loading \? <div role="status"[\s\S]*?t\('common\.loading'\)/)
  assert.match(servicesPage, /loadError && !loading \? <ErrorState description=\{t\('services\.errors\.loadFailed'\)\} onRetry=\{loadData\}/)
  assert.match(hook, /const request = \+\+requestSequence\.current/)
  assert.match(hook, /if \(request !== requestSequence\.current\) return/)
  assert.match(hook, /return \(\) => \{ requestSequence\.current \+= 1 \}/)
})

test('frizerski editor ne može spremati nepotpune read podatke', () => {
  assert.match(stylistEditor, /disabled=\{saving \|\| editorState !== 'ready'\}/)
  assert.match(stylistEditor, /<ErrorState description=\{t\(editorErrorKey\)\} onRetry=\{retryEditor\}/)
  assert.match(stylistEditorHook, /fetchCompleteAdminStylistServices/)
  assert.match(stylistEditorHook, /fetchCompleteAdminServices/)
  assert.match(stylistEditorHook, /editorState !== 'ready'/)
  assert.match(stylistEditorHook, /dateOverride != null/)
  assert.match(stylistEditorHook, /useAuthStore\.getState\(\)\.sessionVersion/)
})

test('svaki Switch ima pristupačno ime (4.1.2)', () => {
  const files = { salon, services, stylists }
  let total = 0
  for (const [name, src] of Object.entries(files)) {
    for (const m of src.matchAll(/<Switch\b[\s\S]*?\/>/g)) {
      total += 1
      assert.match(
        m[0],
        /aria-label=\{t\(/,
        `${name}: Switch bez aria-label -> ${m[0].slice(0, 80)}`,
      )
    }
  }
  assert.equal(total, 8, 'ukupno 8 Switch kontrola u modulu')
})

test('time inputi u radnom vremenu imaju pristupačno ime (4.1.2)', () => {
  // Salon: opensTime/closesTime · Stylists: startTime/endTime
  for (const [name, src, keys] of [
    ['Salon.tsx', salon, ['salon.aria.opensTime', 'salon.aria.closesTime']],
    ['Stylists.tsx', stylists, ['stylists.aria.startTime', 'stylists.aria.endTime']],
  ]) {
    for (const key of keys) {
      assert.ok(src.includes(key), `${name}: nedostaje ${key}`)
    }
    // svaki type="time" mora imati aria-label u istom elementu
    const inputs = src.match(/<Input\b[\s\S]*?\/>/g) || []
    const timeInputs = inputs.filter((i) => /type="time"/.test(i))
    assert.equal(timeInputs.length, 2, `${name}: 2 time inputa`)
    for (const i of timeInputs) {
      assert.match(i, /aria-label=\{t\(/, `${name}: time input bez aria-label`)
    }
  }
})

test('praznični redovi imaju razlučive lokalizovane nazive akcija', () => {
  for (const key of ['editHoliday', 'deleteHoliday', 'sendHolidayNotification']) {
    assert.match(salonHolidayTable, new RegExp(`salon\\.aria\\.${key}', \\{ name: holidayAccessibleName\\(h\\) \\}`))
    for (const lang of ['bs', 'en']) {
      const locale = JSON.parse(read(`../../i18n/locales/${lang}.json`))
      assert.match(locale.salon.aria[key], /\{\{name\}\}/)
    }
  }
  assert.match(salonHolidayTable, /sameNameAndDate\.findIndex/)
})

test('radno vrijeme: ime kontrole uključuje dan (4.1.2)', () => {
  // Bez dana bi svih 7 redova imalo isto ime.
  assert.match(salon, /salon\.aria\.workingDayToggle', \{ day: formatWeekday\(wh\.dayOfWeek/)
  assert.match(stylists, /stylists\.aria\.workingDayToggle', \{ day: formatWeekday\(wh\.dayOfWeek/)
  assert.match(salon, /salon\.aria\.opensTime', \{ day: formatWeekday\(wh\.dayOfWeek/)
})

test('svih 5 tabela ima scope i caption (1.3.1)', () => {
  assert.match(serviceCatalog, /import \{ ServiceTable \} from '\.\/service-table'/)
  assert.match(serviceCatalog, /<ServiceTable\b/)
  assert.match(serviceTable, /<DataTable\b/)
  // 2026-11-09 — Salon.tsx je prešao na dijeljenu `DataTable` komponentu, pa njegova
  // 2 tabele (4 + 5 = 9 <th>) više nemaju ručni markup.
  // 2026-11-17 (Faza C (9/)) — i Stylists.tsx prelazi na `DataTable` (2 tabele), pa ručno
  // pisanih <th> više nema nigdje u modulu: dokaz je sada u potpunosti u komponenti.
  //   - ručno pisane tabele: <th scope="col"> i <caption> u izvornom tekstu,
  //   - DataTable potrošači: `caption={t(...)}` prop, a markup garantuje komponenta.
  const dataTable = read('../shell/admin/ui/data-table.tsx')
  assert.match(dataTable, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(dataTable, /scope="col"/)

  const all = { 'Salon.tsx': salon, 'Services.tsx': services, 'Stylists.tsx': stylists }
  let thTotal = 0
  let capTotal = 0
  let tableTotal = 0
  for (const [name, src] of Object.entries(all)) {
    const ths = headers(src)
    thTotal += ths.length
    assert.deepEqual(
      ths.filter((h) => !/scope="col"/.test(h)),
      [],
      `${name}: <th> bez scope`,
    )
    capTotal += (src.match(/<caption className="sr-only">\{t\('[^']+'\)\}<\/caption>/g) || []).length
    const dt = (src.match(/<DataTable\b/g) || []).length
    const dtCaptions = (src.match(/caption=\{t\('[^']+'\)\}/g) || []).length
    assert.equal(dtCaptions, dt, `${name}: svaki <DataTable> mora imati caption prop`)
    capTotal += dtCaptions
    tableTotal += (src.match(/<table\b/g) || []).length + dt
  }
  assert.equal(thTotal, 0, '0 ručno pisanih <th> — sve tabele u modulu su na DataTable')
  assert.equal(tableTotal, 5, '5 tabela u modulu (sve na DataTable)')
  assert.equal(capTotal, 5, '5 tabela -> 5 caption-ova (svi preko caption propa)')
})

test('svih 5 tabela opt-in u card mode (1.4.10)', () => {
  for (const [name, src] of [
    ['Salon.tsx', salon],
    ['Services.tsx', services],
    ['Stylists.tsx', stylists],
  ]) {
    const tables = (src.match(/<table className="[^"]*"/g) || [])
    for (const t of tables) {
      assert.match(t, /data-table/, `${name}: tabela bez data-table klase`)
    }
  }
  assert.match(css, /table\.data-table tbody td::before/)
  // index.css nije uključen u runtime; za izdvojenu tabelu usluga dodatno
  // provjeri aktivni stylesheet i vezu klase s DataTable, bez tvrdnje da su
  // ostale tabele time popravljene.
  assert.match(serviceTable, /tableClassName="service-catalog-table"/)
  assert.match(runtimeCss, /@media \(max-width: 639px\)\s*\{\s*table\.service-catalog-table/)
  assert.match(runtimeCss, /table\.service-catalog-table tbody td::before\s*\{\s*content: attr\(data-label\)/)

  // svaki <td> osim colSpan empty-state mora imati dinamicki data-label
  for (const [name, src] of [
    ['Salon.tsx', salon],
    ['Services.tsx', services],
    ['Stylists.tsx', stylists],
  ]) {
    const tds = cells(src)
    const span = tds.filter((t) => /colSpan=/.test(t))
    const labelled = named(tds)
    assert.equal(
      labelled.length + span.length,
      tds.length,
      `${name}: <td> bez data-label (${tds.length} ukupno, ${labelled.length} label, ${span.length} colSpan)`,
    )
    assert.equal(
      tds.filter((t) => /data-label="/.test(t)).length,
      0,
      `${name}: data-label ne smije biti hardkodovan literal`,
    )
  }
})

test('Salon ima po jedan <h1> u svakoj međusobno isključivoj grani', () => {
  // Loading, error i absent završavaju ranim returnom; zadnja je učitana grana.
  const loading = salonPage.indexOf('  if (loading) {')
  const error = salonPage.indexOf('  if (loadError) {')
  const absent = salonPage.indexOf('  if (noSalonExists || !salon) {')
  const loaded = salonPage.indexOf('  return (\n    <div className="space-y-6">', absent)
  assert.ok(loading >= 0 && error > loading && absent > error && loaded > absent)
  for (const src of [salonPage.slice(loading, error), salonPage.slice(error, absent), salonPage.slice(absent, loaded)]) {
    assert.match(src, /return \(/)
    assert.equal((src.match(/<h1\b/g) || []).length, 1)
  }
  assert.equal((salonPage.slice(loaded).match(/<h1\b/g) || []).length, 1)
})

test('D6 (2.5.7) zadovoljen — upload ima native input, ne samo drag&drop', () => {
  // Atributi između `<input` i `type="file"` su dozvoljeni (npr. `id`): tvrdnja je da
  // native input postoji, ne da je `type` prvi atribut.
  assert.match(services, /<input[^>]*\stype="file"/)
  assert.match(services, /svcFileRef\.current\?\.click\(\)/, 'mora postojati dugme koje okida input')
  assert.equal(
    /onDrop=/.test(services),
    false,
    'ne smije postojati drag-only put bez single-pointer alternative',
  )
})
