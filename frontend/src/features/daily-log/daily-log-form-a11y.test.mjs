import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const fields = readFileSync(new URL('./entry-form-fields.tsx', import.meta.url), 'utf8')
const pricing = readFileSync(new URL('./pricing-panel.tsx', import.meta.url), 'utf8')
const table = readFileSync(new URL('./entry-table.tsx', import.meta.url), 'utf8')

/**
 * Ovi testovi NE renderuju komponentu - čitaju izvor, kao i ostatak suite-a u ovom
 * modulu. Zato namjerno provjeravaju *ožičenje* (da se id-jevi poklapaju, da svaka
 * opcija ima role, da su sve tipke obrađene), a ne samo prisustvo atributa.
 * Ponašanje comboboxa pod tastaturom ostaje neprovjereno izvršavanjem; to je
 * zabilježeno u CHANGELOG-u i ostaje za Playwright/axe (faza 13).
 */

const PICKERS = [
  {
    name: 'client',
    inputId: 'dailylog-client',
    listboxId: 'dailylog-client-listbox',
    optionPrefix: 'dailylog-client-opt-',
  },
  {
    name: 'service',
    inputId: 'dailylog-services',
    listboxId: 'dailylog-service-listbox',
    optionPrefix: 'dailylog-service-opt-',
  },
]

for (const picker of PICKERS) {
  test(`${picker.name} picker: input je combobox vezan na svoj listbox`, () => {
    const input = new RegExp(
      `id="${picker.inputId}"[\\s\\S]*?role="combobox"[\\s\\S]*?` +
        `aria-controls="${picker.listboxId}"`,
    )
    assert.match(fields, input, 'input nema role="combobox" + aria-controls na listbox')

    // aria-expanded mora biti izražen, ne izostavljen
    assert.match(fields, new RegExp(`id="${picker.inputId}"[\\s\\S]*?aria-expanded=\\{`))
  })

  test(`${picker.name} picker: listbox ima id koji aria-controls referencira`, () => {
    assert.match(fields, new RegExp(`id="${picker.listboxId}"\\s*\\n\\s*role="listbox"`))
  })

  test(`${picker.name} picker: aria-activedescendant i id opcije dijele isti prefiks`, () => {
    // Kljucna invarijanta: ako se prefiksi raziđu, aria-activedescendant pokazuje
    // na nepostojeći element i čitač ekrana gubi aktivnu opciju.
    assert.match(
      fields,
      new RegExp(`aria-activedescendant=\\{[\\s\\S]*?\\\`${picker.optionPrefix}\\$\\{`),
      'aria-activedescendant ne gradi id s očekivanim prefiksom',
    )
    assert.match(
      fields,
      new RegExp(`id=\\{\\\`${picker.optionPrefix}\\$\\{`),
      'opcija nema id s istim prefiksom',
    )
  })

  test(`${picker.name} picker: svaka opcija ima role="option" i aria-selected`, () => {
    const options = fields.match(/role="option"/g) ?? []
    const selected = fields.match(/aria-selected=/g) ?? []
    assert.equal(options.length, 2, 'očekuju se 2 listboxa s role="option"')
    assert.equal(
      selected.length,
      options.length,
      'broj aria-selected mora odgovarati broju role="option"',
    )
  })

  test(`${picker.name} picker: tastatura pokriva strelice, Enter i Escape`, () => {
    // stepIndex je zajednički za oba pickera
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
      assert.match(fields, new RegExp(`if \\(key === '${key}'\\)`), `stepIndex ne obrađuje ${key}`)
    }
    assert.match(fields, /e\.key === 'Enter'/)
    assert.match(fields, /e\.key === 'Escape'/)
    // preventDefault je obavezan: bez njega Enter submitira formu umjesto da izabere opciju
    const prevents = fields.match(/e\.preventDefault\(\)/g) ?? []
    assert.ok(prevents.length >= 6, `očekivano >=6 preventDefault, nađeno ${prevents.length}`)
  })
}

test('service picker je multi-select, client picker nije', () => {
  assert.match(fields, /aria-multiselectable="true"/)
  const multi = fields.match(/aria-multiselectable/g) ?? []
  assert.equal(multi.length, 1, 'samo service picker smije biti multi-select')
  // service aria-selected mora odražavati izbor, ne samo tastaturski fokus
  assert.match(fields, /aria-selected=\{form\.serviceIds\.includes\(svc\.id\)\}/)
})

test('mouse ponašanje nije uklonjeno dodavanjem comboboxa', () => {
  const mouseDown = fields.match(/onMouseDown=\{\(ev\) => ev\.preventDefault\(\)\}/g) ?? []
  assert.equal(mouseDown.length, 2, 'oba pickera moraju zadržati onMouseDown preventDefault')
  assert.match(fields, /onClick=\{\(\) => onSelectClient\(c\)\}/)
  assert.match(fields, /onClick=\{\(\) => onToggleService\(svc\)\}/)
})

test('tabela ima caption i scope na svim th', () => {
  assert.match(table, /<caption className="sr-only">\{t\('dailyLog\.table\.caption'\)\}<\/caption>/)
  const th = (table.match(/<th\b/g) ?? []).length
  const scoped = (table.match(/<th scope="col"/g) ?? []).length
  assert.equal(scoped, th, `svih ${th} <th> mora imati scope="col", ima ih ${scoped}`)
  assert.ok(th > 0, 'tabela mora imati barem jedan <th>')
})

test('pricing panel grupa je imenovana preko aria-labelledby', () => {
  assert.match(pricing, /<Label id="dailylog-service-prices">/)
  assert.match(pricing, /role="group" aria-labelledby="dailylog-service-prices"/)
  assert.match(pricing, /<Label htmlFor="dailylog-amount-paid"/)
})
