import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const salon = read('../../pages/Salon.tsx')
const services = read('../../pages/Services.tsx')
const stylists = read('../../pages/Stylists.tsx')
const css = read('../../index.css')

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

test('radno vrijeme: ime kontrole uključuje dan (4.1.2)', () => {
  // Bez dana bi svih 7 redova imalo isto ime.
  assert.match(salon, /salon\.aria\.workingDayToggle', \{ day: formatWeekday\(wh\.dayOfWeek/)
  assert.match(stylists, /stylists\.aria\.workingDayToggle', \{ day: formatWeekday\(wh\.dayOfWeek/)
  assert.match(salon, /salon\.aria\.opensTime', \{ day: formatWeekday\(wh\.dayOfWeek/)
})

test('svih 5 tabela ima scope i caption (1.3.1)', () => {
  // 2026-11-09 — Salon.tsx je prešao na dijeljenu `DataTable` komponentu, pa njegova
  // 2 tabele (4 + 5 = 9 <th>) više nemaju ručni markup. Ukupan broj TABELA je i dalje 5
  // (2 u Salonu + 1 u Services + 2 u Stylists), ali se dokaz dijeli:
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
  assert.equal(thTotal, 18, '18 <th> u ručno pisanim tabelama (Services 8 + Stylists 10)')
  assert.equal(tableTotal, 5, '5 tabela u modulu (2 DataTable + 3 ručne)')
  assert.equal(capTotal, 5, '5 tabela -> 5 caption-ova (2 preko propa + 3 ručno)')
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

test('D1 iz plana NIJE prekršaj — dva <h1> su u međusobno isključivim granama', () => {
  // Plan je tvrdio da Salon.tsx ima 2 <h1>. Ima ih u izvoru, ali jedan je u
  // ranom return-u (`if (noSalonExists || !salon)`), drugi u konačnom.
  assert.match(salon, /if \(noSalonExists \|\| !salon\) \{\s*return \(/)
  assert.equal((salon.match(/<h1/g) || []).length, 2, 'u izvoru su 2, ali se ne renderuju zajedno')
})

test('D6 (2.5.7) zadovoljen — upload ima native input, ne samo drag&drop', () => {
  assert.match(services, /<input\s+type="file"/)
  assert.match(services, /svcFileRef\.current\?\.click\(\)/, 'mora postojati dugme koje okida input')
  assert.equal(
    /onDrop=/.test(services),
    false,
    'ne smije postojati drag-only put bez single-pointer alternative',
  )
})
