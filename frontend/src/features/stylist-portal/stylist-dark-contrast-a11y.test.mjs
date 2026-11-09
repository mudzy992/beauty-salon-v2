/**
 * Faza 11 — WCAG 1.4.3 (Contrast Minimum) u **tamnoj** temi, stylist portal
 *
 * Nalaz iz izvora: `text-slate-500` se koristio na **32 mjesta** bez `dark:` varijante.
 * Na svjetloj površini je 4.76:1 (PASS), ali na tamnoj (`slate-900`) je **3.75:1** —
 * ispod 4.5:1, dakle prekršaj koji se vidi samo u tamnoj temi.
 * Zamijenjeno semantičkim `text-content-muted` (`--text-muted`: 5.61:1 svjetlo / 6.56:1 tamno).
 *
 * Test radi **isti sweep** koji je nalaz i otkrio: za svaku tekstualnu paleta-klasu bez
 * `dark:` varijante izračuna kontrast na tamnoj površini iz ugrađene Tailwind palete.
 *
 * Bez browsera: izvorni ugovor + izmjereni kontrast (kao i `check_ui_contrast.py`).
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Tailwind v3 default paleta — samo nijanse koje se mogu pojaviti u ovom dijelu koda
const PALETTE = {
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  rose: { 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  emerald: { 500: '#10b981', 600: '#059669', 700: '#047857' },
  amber: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
  red: { 500: '#ef4444', 600: '#dc2626' },
  green: { 600: '#16a34a', 700: '#15803d' },
}
const DARK_SURFACE = '#0f172a' // slate-900
const LIGHT_SURFACE = '#ffffff'

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
const luminance = ([r, g, b]) => {
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const contrast = (a, b) => {
  const [x, y] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    return statSync(full).isDirectory()
      ? walk(full)
      : full.endsWith('.tsx') && !full.includes('.test.')
        ? [full]
        : []
  })
const SRC = [
  ...walk(join(root, 'features/stylist-portal')),
  ...walk(join(root, 'features/stylist-workbook')),
]
const rel = (p) => p.slice(root.length + 1).replace(/\\/g, '/')

const sweep = () => {
  const rows = []
  for (const f of SRC) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/(?<![:\w-])text-((?:slate|rose|emerald|amber|red|green)-\d{2,3})\b/g)) {
      const [fam, shade] = [m[1].slice(0, m[1].lastIndexOf('-')), Number(m[1].slice(m[1].lastIndexOf('-') + 1))]
      const hex = PALETTE[fam]?.[shade]
      if (!hex) continue
      const ctx = src.slice(Math.max(0, m.index - 160), m.index + m[1].length + 160)
      rows.push({
        f,
        line: src.slice(0, m.index).split('\n').length,
        cls: m[1],
        hasDarkVariant: ctx.includes('dark:text-'),
        onLight: contrast(hex, LIGHT_SURFACE),
        onDark: contrast(hex, DARK_SURFACE),
      })
    }
  }
  return rows
}

test('1.4.3: nijedna tekstualna paleta-klasa bez dark: varijante ne pada ispod 4.5:1 na tamnoj', () => {
  const rows = sweep()
  assert.ok(rows.length >= 100, `ocekivano >=100 paleta-klasa, nadeno ${rows.length}`)

  const offenders = rows
    .filter((r) => !r.hasDarkVariant && r.onDark < 4.5)
    .map((r) => `${rel(r.f)}:${r.line} text-${r.cls} (svjetlo ${r.onLight.toFixed(2)} / tamno ${r.onDark.toFixed(2)})`)
  assert.deepEqual(offenders, [], `1.4.3 u tamnoj temi:\n  ${offenders.join('\n  ')}`)
})

test('text-slate-500 (3.75:1 tamno) je potpuno zamijenjen sa content-muted', () => {
  let slate500 = 0
  let muted = 0
  for (const f of SRC) {
    const src = readFileSync(f, 'utf8')
    slate500 += (src.match(/text-slate-500/g) ?? []).length
    muted += (src.match(/text-content-muted/g) ?? []).length
  }
  assert.equal(slate500, 0, 'text-slate-500 jos postoji u stylist portalu')
  // Zamjena postoji (32 mjesta). Namjerno NE asertujemo tacan broj: prag bi bio krhak i
  // padao bi na bezopasnoj zamjeni jedne klase drugom koja takodje prolazi kontrast.
  // Stvarni cuvar je sweep iznad — on pada na svakoj boji ispod 4.5:1 u tamnoj temi.
  assert.ok(muted >= 30, `content-muted je erozirao: nadeno ${muted}, bilo je 32+`)
})

test('izmjereno: --text-muted zadovoljava 4.5:1 u obje teme, slate-500 pada u tamnoj', () => {
  const css = readFileSync(join(root, 'styles/globals.css'), 'utf8')
  const hslToHex = (h, s, l) => {
    s /= 100; l /= 100
    const k = (n) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [f(0), f(8), f(4)]
  }
  const lumRgb = ([r, g, b]) => {
    const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const [x, y] = [lumRgb(a), lumRgb(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
  }
  const light = /--text-muted:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(css)
  const dark = /--text-muted:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(css.slice(css.indexOf('.dark')))
  assert.ok(light && dark, '--text-muted nije naden u obje teme')

  const surfaceLight = hslToHex(0, 0, 100)
  const surfaceDark = hslToHex(222.2, 47.4, 11.2)
  const l = ratio(hslToHex(+light[1], +light[2], +light[3]), surfaceLight)
  const d = ratio(hslToHex(+dark[1], +dark[2], +dark[3]), surfaceDark)
  assert.ok(l >= 4.5, `content-muted svjetlo: ${l.toFixed(2)}:1`)
  assert.ok(d >= 4.5, `content-muted tamno: ${d.toFixed(2)}:1`)

  // upravo zato je slate-500 zamijenjen
  const slate = contrast('#64748b', DARK_SURFACE)
  assert.ok(slate < 4.5, `slate-500 na tamnoj bi trebao biti ispod 4.5, dobijeno ${slate.toFixed(2)}:1`)
  assert.ok(contrast('#64748b', LIGHT_SURFACE) >= 4.5, 'slate-500 na svjetloj prolazi — problem je samo tamna tema')
})
