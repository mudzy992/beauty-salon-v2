import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

// Jedini izvor istine za refaktor. Ime fajla se ne mijenja (odluka Q7).
const SPEC_PATH = join(
  fileURLToPath(new URL('../../docs/design/', import.meta.url)),
  'NEJRA – beauty salon · Referentni dokument.html',
)
const html = readFileSync(SPEC_PATH, 'utf8')

// JSDOM ne implementira matchMedia, a dokument ga koristi za pocetnu temu.
// Ubaci se minimalni stub prije nego se skripta dokumenta pokrene.
function makeDom(source) {
  return new JSDOM(source, {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.matchMedia = () => ({
        matches: false,
        media: '',
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
      })
    },
  })
}

function verifySpec(source) {
  const dom = makeDom(source)
  try {
    const doc = dom.window.document

    assert.equal(doc.documentElement.lang, 'bs', 'dokument mora biti na BS jeziku')
    assert.match(doc.title, /NEJRA/)
    assert.match(doc.title, /Aurum/)
    assert.match(doc.title, /specifikacija/i)

    // 14 sekcija: izvornih 8 + dogradnja 09–14.
    for (let i = 1; i <= 14; i += 1) {
      assert.ok(doc.getElementById(`s${i}`), `nedostaje sekcija s${i}`)
    }

    // Svi linkovi su interni i cilj postoji (nav 01–14 + #book).
    for (const link of doc.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href')
      assert.ok(href.startsWith('#'), `neocekivani vanjski link: ${href}`)
      assert.ok(doc.getElementById(href.slice(1)), `pokvareni anchor: ${href}`)
    }
    assert.equal(doc.querySelectorAll('script[src], link[rel="stylesheet"]').length, 0)

    // §09 — mapa svih 58 deklaracija ruta iz koda.
    const routeRows = [...doc.querySelectorAll('#routes tbody tr')]
    assert.equal(routeRows.length, 58, 'mapa mora imati tocno 58 deklaracija ruta')
    for (const path of ['/', '/admin/reservations/calendar', '/admin/settings', '/stylist/inbox', '*']) {
      assert.ok(
        routeRows.some((row) => row.cells[0].textContent.trim() === path),
        `nedostaje ruta ${path}`,
      )
    }
    assert.ok(routeRows.some((row) => row.cells[0].textContent.trim() === '/stylist/stats'))

    // §10 — tri stanja teme i njihova vlasnistva.
    const states = [...doc.querySelectorAll('#theme-states tbody tr')].map((row) =>
      row.getAttribute('data-state'),
    )
    assert.deepEqual(states, ['classic', 'aurum-light', 'aurum-dark'])
    assert.match(doc.querySelector('#theme-states').textContent, /theme_primary/)
    assert.match(doc.body.textContent, /Aurum fiksira paletu/)

    // §10 — omjeri se racunaju uzivo; nijedan par ne smije pasti.
    const contrastRows = [...doc.querySelectorAll('#tok3 tbody tr')]
    assert.equal(contrastRows.length, 22, '2 Aurum stanja x 11 parova')
    for (const row of contrastRows) {
      assert.equal(row.cells[4].textContent.trim(), 'Prolazi', `pada par: ${row.cells[1].textContent}`)
    }
    const originalRows = [...doc.querySelectorAll('#ctb tr')]
    assert.equal(originalRows.length, 22, 'izvorna tablica iz sekcije 03 ostaje')
    for (const row of originalRows) {
      assert.equal(row.cells[4].textContent.trim(), 'Prolazi')
    }

    // §11 — katalog sablona.
    assert.ok(doc.getElementById('templates'), 'nedostaje katalog sablona')
    assert.ok(doc.querySelectorAll('#templates tbody tr').length >= 11)

    // §12 — ugovor izbornika teme.
    const themeSpec = doc.getElementById('theme-spec')
    assert.ok(themeSpec)
    for (const label of ['Klasična svijetla', 'Aurum svijetla', 'Aurum tamna']) {
      assert.ok(themeSpec.textContent.includes(label), `nedostaje stanje: ${label}`)
    }
    for (const token of ['localStorage', 'data-skin', 'theme-color', 'role="status"']) {
      assert.ok(themeSpec.textContent.includes(token), `nedostaje ugovor: ${token}`)
    }

    // §13 — paritet i CI matrica.
    assert.ok(doc.getElementById('parity'))
    const parity = doc.getElementById('parity').textContent
    for (const token of ['API', 'i18n', 'queryKeys', 'socket', 'bs.json', 'en.json']) {
      assert.ok(parity.includes(token), `nedostaje paritetni ugovor: ${token}`)
    }
    const ci = doc.getElementById('ci-matrix').textContent
    for (const job of ['repo-checks', 'backend', 'frontend', 'a11y-e2e', 'mobile']) {
      assert.ok(ci.includes(job), `nedostaje CI posao: ${job}`)
    }

    // Dokument ostaje "ziv": prekidac teme i dalje radi.
    const themeBtn = doc.getElementById('themeBtn')
    assert.ok(themeBtn)
    const before = doc.documentElement.dataset.theme
    themeBtn.click()
    assert.notEqual(doc.documentElement.dataset.theme, before)
    themeBtn.click()
    assert.equal(doc.documentElement.dataset.theme, before)
  } finally {
    dom.window.close()
  }
}

test('NEJRA: puna specifikacija, 3 stanja, 58 ruta i zivi kontrast', () => verifySpec(html))

test('NEJRA: mutacije ugovora se otkrivaju', () => {
  const mutations = [
    ['id="s9"', 'id="sX"'],
    ['id="s14"', 'id="sY"'],
    ['data-state="classic"', 'data-state="x"'],
    ['<td>/stylist/stats</td>', '<td>/stylist/statistika</td>'],
    ['<code>theme_primary</code>', '<code>boja</code>'],
    ['id="templates"', 'id="sabloni"'],
    ["$('#tok3 tbody').innerHTML=h3;", 'void 0'],
  ]
  for (const [before, after] of mutations) {
    assert.equal(html.split(before).length - 1, 1, `mutacija mora pogoditi tocno jedno mjesto: ${before}`)
    assert.throws(
      () => verifySpec(html.replace(before, after)),
      `mutacija nije uhvacena: ${before}`,
    )
  }
})
