/**
 * Faza 13 — WCAG 2.1.1 (Keyboard) + 4.1.2 (Name, Role, Value):
 * izbor usluge u `ReservationScheduler` bio je dostupan SAMO mišem.
 *
 * Nalaz iz izvora (prije ispravke):
 *   <ul className="...">                        <- bez role="listbox"
 *     <li className="cursor-pointer ..."        <- bez role="option", bez tabIndex,
 *         onClick={() => toggleServiceId(...)}>    bez onKeyDown
 * Tastaturni korisnik je mogao **kucati** u pretragu, ali nijednu opciju nije mogao
 * niti dosegnuti niti aktivirati. Provjereno da nema alternativnog puta: jedini drugi
 * poziv `toggleServiceId` (linija 1116) je dugme za **uklanjanje** već izabrane usluge.
 *
 * Ispravljeno po obrascu iz `features/daily-log/entry-form-fields.tsx` (multi-select
 * varijanta), koji je već pokriven testom `daily-log-form-a11y`.
 *
 * Bez browsera: izvorni ugovor.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SRC = root
const at = (p) => readFileSync(join(SRC, p), 'utf8')

const FILE = 'features/reservations/components/ReservationScheduler.tsx'
const LISTBOX = 'res-create-service-listbox'

test('2.1.1/4.1.2: pretraga usluga je pravi combobox (ulaz + listbox + opcije)', () => {
  const src = at(FILE)

  // ulaz
  const i = src.indexOf('id="res-create-service"')
  assert.ok(i > 0, 'ulaz za pretragu usluga nije naden')
  const input = src.slice(i, i + 1400)
  assert.match(input, /role="combobox"/)
  assert.match(input, /aria-expanded=\{/)
  assert.match(input, new RegExp(`aria-controls="${LISTBOX}"`), 'aria-controls ne pokazuje na listbox')
  assert.match(input, /aria-autocomplete="list"/)
  assert.match(input, /aria-activedescendant=\{/)
  assert.match(input, /autoComplete="off"/)

  // listbox
  const u = src.indexOf(`id="${LISTBOX}"`)
  assert.ok(u > 0, 'listbox nema id na koji ukazuje aria-controls')
  const ul = src.slice(u, u + 400)
  assert.match(ul, /\n\s*role="listbox"/)
  assert.match(ul, /aria-multiselectable="true"/, 'izbor je višestruk (toggleServiceId)')
  assert.match(ul, /aria-label=\{t\('reservations\.calendar\.create\.service'\)\}/)

  // opcije
  const li = src.slice(src.indexOf('role="option"') - 200, src.indexOf('role="option"') + 500)
  assert.match(li, /id=\{`res-create-service-opt-\$\{svc\.id\}`\}/, 'opcija nema id za aria-activedescendant')
  assert.match(li, /aria-selected=\{createDraft\.serviceIds\.includes\(svc\.id\)\}/)
})

test('2.1.1: tastatura doseže i aktivira opcije (strelice, Enter, Escape)', () => {
  const src = at(FILE)
  const i = src.indexOf('id="res-create-service"')
  const input = src.slice(i, i + 2600)

  assert.match(input, /onKeyDown=\{\(e\) => \{/, 'ulaz nema onKeyDown')
  // strelice/Home/End idu preko stepIndex-a
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
    assert.match(src, new RegExp(`if \\(key === '${key}'\\)`), `stepIndex ne obrađuje ${key}`)
  }
  assert.match(input, /e\.key === 'Enter'/)
  assert.match(input, /e\.key === 'Escape'/)
  assert.match(input, /toggleServiceId\(filteredServices\[serviceActiveIdx\]\.id\)/, 'Enter ne bira opciju')

  const prevents = [...input.matchAll(/e\.preventDefault\(\)/g)]
  assert.ok(prevents.length >= 3, `očekivano >=3 preventDefault, nađeno ${prevents.length}`)
})

test('čuvar: nijedan klikabilan <li> u src/ nema klik bez role="option"', () => {
  // Kraj otvarajućeg taga se ne može naći regexom `[^>]*`: arrow funkcije u atributima
  // (`onMouseDown={(ev) => ev.preventDefault()}`) sadrže `>`. Zato skener poštuje
  // dubinu vitičastih zagrada i stringove.
  const tagEnd = (src, start) => {
    let depth = 0
    let str = null
    for (let i = start; i < src.length; i += 1) {
      const c = src[i]
      if (str) {
        if (c === str && src[i - 1] !== '\\') str = null
        continue
      }
      if (c === "'" || c === '"' || c === '`') {
        str = c
        continue
      }
      if (c === '{') depth += 1
      else if (c === '}') depth -= 1
      else if (c === '>' && depth === 0) return i
    }
    return -1
  }

  const files = []
  ;(function walk(d) {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      if (statSync(p).isDirectory()) walk(p)
      else if (p.endsWith('.tsx')) files.push(p)
    }
  })(SRC)

  let checked = 0
  const bad = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/<li\b/g)) {
      const end = tagEnd(src, m.index)
      if (end < 0) continue
      const tag = src.slice(m.index, end + 1)
      if (!/\bonClick=\{/.test(tag)) continue
      checked += 1
      if (!/role="option"/.test(tag)) bad.push(`${f}: <li onClick> bez role="option"`)
    }
  }
  // 3 = 2 u daily-log (client + service) + 1 u ReservationScheduler.
  // Bez ove donje granice sweep bi tiho "prošao" na praznom skupu.
  assert.ok(checked >= 3, `sweep je obuhvatio samo ${checked} klikabilnih <li> — premalo da bi značio`)
  assert.deepEqual(bad, [], bad.join('\n'))
})
