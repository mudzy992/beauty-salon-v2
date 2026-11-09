/**
 * Faza 11 — WCAG 4.1.3 (Status Messages), 3.3.1 (Error Identification) i 1.4.3 u stylist portalu
 *
 * Nalazi iz izvora (plan ih nije naveo; D3/D7/D8 iz plana su opovrgnuti — vidi CHANGELOG):
 *
 *  1. `workbook-detail-page.tsx` — upload status (`uploadInProgress`) se dinamički
 *     pojavljivao i nestajao **bez** `role="status"` → 4.1.3.
 *  2. `daily-log-disposition-panel.tsx` — error u dijalogu bez `role="alert"` → 4.1.3 / 3.3.1.
 *  3. `workbook-new-entry-page.tsx` — „potreban je spol klijenta" bez `role="alert"` → isto.
 *  4. `text-rose-600` nema dark varijantu: **3.80:1** na tamnoj površini → 1.4.3.
 *     (`--bad-fg` je 6.80:1 svjetlo / 7.71:1 tamno.)
 *
 * Bez browsera: izvorni ugovor + izmjereni kontrast.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const at = (p) => readFileSync(join(root, p), 'utf8')

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.tsx') && !full.includes('.test.') ? [full] : []
  })
const SRC = [...walk(join(root, 'features/stylist-portal')), ...walk(join(root, 'features/stylist-workbook'))]
const rel = (p) => p.slice(root.length + 1)

test('4.1.3: upload status ima role="status" + aria-live', () => {
  const src = at('features/stylist-workbook/pages/workbook-detail-page.tsx')
  const i = src.indexOf("t('stylistWorkbook.detail.uploadInProgress')")
  assert.ok(i > 0, 'upload status poruka nije nadena')
  const container = src.slice(src.lastIndexOf('<div', i), i)
  assert.match(container, /role="status"/)
  assert.match(container, /aria-live="polite"/)
  // spinner je dekorativan, tekst je dio statusa
  assert.match(container, /aria-hidden="true"/)
})

test('3.3.1 / 4.1.3: error poruke u obrascima imaju role="alert"', () => {
  const disposition = at('features/stylist-workbook/components/daily-log-disposition-panel.tsx')
  assert.match(disposition, /<p role="alert" className="text-sm text-bad-foreground">/)

  const newEntry = at('features/stylist-workbook/pages/workbook-new-entry-page.tsx')
  const i = newEntry.indexOf("t('stylistWorkbook.newEntry.clientGenderRequired')}")
  assert.ok(i > 0)
  const tag = newEntry.slice(newEntry.lastIndexOf('<p', i), i)
  assert.match(tag, /role="alert"/, '„spol klijenta je obavezan" se ne najavljuje')

  // postojeci error blokovi (inbox/schedule/direct booking) moraju ostati role="alert"
  for (const f of [
    'features/stylist-portal/pages/stylist-inbox-page.tsx',
    'features/stylist-portal/pages/stylist-schedule-page.tsx',
  ]) {
    assert.match(at(f), /role="alert"/, `${rel(f)}: loadFailed bez role="alert"`)
  }
})

test('1.4.3: nema text-rose-600 (3.80:1 u tamnoj temi) — koristi se bad-foreground', () => {
  const offenders = []
  let bad = 0
  for (const f of SRC) {
    const src = readFileSync(f, 'utf8')
    const hits = [...src.matchAll(/(^|[\s"'`])text-rose-\d+/g)]
    if (hits.length) offenders.push(`${rel(f)} (${hits.length})`)
    bad += (src.match(/text-bad-foreground/g) ?? []).length
  }
  assert.deepEqual(offenders, [], `text-rose-* u stylist portalu: ${offenders.join(', ')}`)
  assert.ok(bad >= 4, `ocekivano >=4 text-bad-foreground, nadeno ${bad}`)
})

test('izmjereni kontrast: bad-foreground zadovoljava 4.5:1 u obje teme, rose-600 ne', () => {
  // HSL -> RGB (Tailwind/hsl vrijednosti iz globals.css)
  const hslToRgb = (h, s, l) => {
    s /= 100; l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [f(0), f(8), f(4)]
  }
  const lum = ([r, g, b]) => {
    const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
  }
  const css = at('styles/globals.css')
  const badFgLight = /--bad-fg:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(css)
  const darkBlock = css.slice(css.indexOf('.dark'))
  const badFgDark = /--bad-fg:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(darkBlock)
  assert.ok(badFgLight && badFgDark, '--bad-fg nije naden u obje teme')

  const surfaceLight = hslToRgb(0, 0, 100)
  const surfaceDark = hslToRgb(222.2, 47.4, 11.2) // slate-900
  const light = ratio(hslToRgb(+badFgLight[1], +badFgLight[2], +badFgLight[3]), surfaceLight)
  const dark = ratio(hslToRgb(+badFgDark[1], +badFgDark[2], +badFgDark[3]), surfaceDark)
  assert.ok(light >= 4.5, `bad-foreground svjetlo: ${light.toFixed(2)}:1`)
  assert.ok(dark >= 4.5, `bad-foreground tamno: ${dark.toFixed(2)}:1`)

  // rose-600 (#e11d48) na tamnoj površini pada ispod 4.5 — zato je zamijenjen
  const rose = ratio([0xe1 / 255, 0x1d / 255, 0x48 / 255], surfaceDark)
  assert.ok(rose < 4.5, `rose-600 na tamnoj bi trebao biti ispod 4.5, dobijeno ${rose.toFixed(2)}:1`)
})
