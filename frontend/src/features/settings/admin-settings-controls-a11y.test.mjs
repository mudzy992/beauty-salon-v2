import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const email = read('../../pages/EmailSettings.tsx')
const notifications = read('../../pages/Notifications.tsx')
const modulePage = read('./settings-module-page.tsx')
const visualEditor = read('../email-settings/email-visual-editor.tsx')
const releaseForm = read('../app-releases/app-release-create-form.tsx')
const css = read('../../index.css')

// ---------------------------------------------------------------------------
// Faza 10 — Postavke: kontrole bez pristupačnog imena + tabela obavijesti.
//
// 4.1.2/1.3.1: 28 <Label> u EmailSettings.tsx bilo je sibling svojih kontrola
//   bez htmlFor/id — 21 <Input>/<Textarea>/<select> i 7 <Switch> bez imena.
//   Radix Switch renderuje <button>, koji JE labelabilan, pa <Label htmlFor> +
//   <Switch id> daje ime (isti obrazac kao setting-editor-boolean.tsx).
// 1.3.1: <Label> je stajao uz <pre> — <pre> NIJE labelabilan element.
// 2.4.4: markAsRead je imao isto ime za svaku obavijest.
// 1.3.1/1.4.10: tabela postavki obavijesti bez scope/caption/data-label.
// ---------------------------------------------------------------------------

const labels = (src) => [...src.matchAll(/<Label\b([^>]*)>/g)]

test('svaki <Label> u EmailSettings je asociran (1.3.1)', () => {
  const all = labels(email)
  assert.equal(all.length, 29, `očekivano 29 <Label>, nađeno ${all.length}`)
  for (const m of all) {
    assert.match(m[1], /htmlFor="[^"]+"/, `<Label> bez htmlFor: ${m[0]}`)
  }
  // nijedan htmlFor ne smije biti prazan niti literal 'undefined'
  assert.equal(/htmlFor=""/.test(email), false)
})

test('svaki htmlFor ima odgovarajući id i svi su jedinstveni (4.1.2)', () => {
  const fors = [...email.matchAll(/htmlFor="([^"]+)"/g)].map((m) => m[1])
  const ids = [...email.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(fors).size, fors.length, 'htmlFor vrijednosti nisu jedinstvene')
  for (const f of fors) {
    assert.equal(ids.filter((i) => i === f).length, 1, `htmlFor="${f}" nema tačno jedan id`)
  }
})

test('svih 7 Switch-eva ima id koji ih imenuje (4.1.2)', () => {
  const switches = [...email.matchAll(/<Switch\b[\s\S]*?\/>/g)]
  assert.equal(switches.length, 7, `očekivano 7 Switch, nađeno ${switches.length}`)
  for (const m of switches) {
    assert.match(m[0], /id="[^"]+"/, `Switch bez id: ${m[0].slice(0, 70)}`)
  }
})

test('<pre> ne smije biti labelovan <Label> elementom (1.3.1)', () => {
  // <pre> nije labelabilan; naslov mora biti običan tekst + aria-labelledby.
  assert.equal(/<Label>\{t\('emailSettings\.campaigns\.htmlPreviewSource'\)\}<\/Label>/.test(email), false,
    'orphan <Label> uz <pre> se ne smije vratiti')
  assert.match(email, /<p id="email-campaign-html-preview-source"/)
  assert.match(email, /aria-labelledby="email-campaign-html-preview-source"/)
})

test('markAsRead ima jedinstveno ime po obavijesti (2.4.4)', () => {
  assert.match(notifications, /aria-label=\{t\('notifications\.markAsReadNamed', \{ title: n\.title \}\)\}/)
  assert.equal(/aria-label=\{t\('notifications\.markAsRead'\)\}/.test(notifications), false,
    'generičko ime se ne smije vratiti')
  // ikona unutar imenovanog dugmeta mora biti dekorativna
  assert.match(notifications, /<Check className="h-4 w-4" aria-hidden="true" \/>/)
})

test('tabela postavki obavijesti ima semantiku (1.3.1, 1.4.10)', () => {
  // 2026-11-09 — tabela je prešla na dijeljenu `DataTable` komponentu, pa `<th>`, `<td>`,
  // `scope` i `data-label` više nisu u `Notifications.tsx`. Garancije se provjeravaju
  // JEDNOM na komponenti (za sve potrošače), a ovdje da je modul stvarno koristi.
  const dataTable = read('../shell/admin/ui/data-table.tsx')
  assert.match(dataTable, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(dataTable, /scope="col"/)
  assert.match(dataTable, /data-label=\{t\(column\.headerKey\)\}/)
  assert.match(dataTable, /app-table data-table w-full/)
  assert.match(css, /table\.data-table tbody td::before/)

  assert.match(notifications, /<DataTable/, 'Notifications ne koristi DataTable')
  assert.match(notifications, /caption=\{t\('notifications\.preferencesTableCaption'\)\}/)
  assert.match(notifications, /rowKey=\{\(type\) => type\}/)
  // Konzistentnost na dashboardima je obavezna: bez lokalnih stil-varijanti.
  for (const prop of ['tableClassName', 'headRowClassName', 'rowClassName', 'unsortedIndicator']) {
    assert.ok(!notifications.includes(prop), `Notifications ne smije prolaziti ${prop}`)
  }
  // Redoslijed kolona je bitan: data-label u card-mode-u je t(column.headerKey).
  const headerKeys = [...notifications.matchAll(/headerKey: '([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(headerKeys, [
    'notifications.notificationType',
    'notifications.push',
    'notifications.email',
  ])
  // Ručno napisana tabela se ne smije vratiti uz dijeljenu komponentu.
  assert.equal((notifications.match(/<table\b/g) || []).length, 0, 'zaostala <table>')
})

test('D4 iz plana NIJE prekršaj — pretraga postavki već najavljuje rezultat (4.1.3)', () => {
  assert.match(modulePage, /role="status" aria-live="polite"/)
  assert.match(modulePage, /aria-controls="settings-groups-list"/)
})

test('D6 iz plana NIJE prekršaj — vizuelni editor već ima tastaturnu alternativu (2.5.7)', () => {
  // Plan je tražio dodavanje gore/dolje dugmadi; ona već postoje uz aria-label.
  assert.match(visualEditor, /draggable/)
  assert.match(visualEditor, /aria-label=\{t\('emailSettings\.campaigns\.moveUp'\)\}/)
  assert.match(visualEditor, /aria-label=\{t\('emailSettings\.campaigns\.moveDown'\)\}/)
})

test('D10 iz plana NIJE prekršaj — APK upload je native input s labelom (2.5.7)', () => {
  assert.match(releaseForm, /<Label htmlFor="apk">/)
  assert.match(releaseForm, /id="apk"\s+type="file"/)
  assert.equal(/onDrop=/.test(releaseForm), false, 'ne smije postojati drag-only put')
})
