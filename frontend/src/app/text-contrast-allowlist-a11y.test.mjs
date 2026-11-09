/**
 * Faza 13, D3 — sweep sirovih tekstualnih boja (1.4.3 / 1.4.11)
 *
 * Plan je tražio „grep text-slate-* → allowlist". Ali **sirova paleta-klasa nije prekršaj**
 * ako kontrast prolazi, pa zabrana klasa ne bi imala a11y vrijednosti (883 svjetle
 * upotrebe u admin/stylist kodu). Zato test mjeri kontrast i za svaki nalaz ispod 4.5:1
 * traži **obrazloženo** mjesto u allowlisti.
 *
 * Dvije stvari koje sweep MORA poštovati (obje su bile izvor lažno pozitivnih):
 *  1. `dark:` varijante su **mrtav kod** — tamna tema se ne može aktivirati
 *     (`darkMode: ['class']`, a `.dark` klasu niko ne postavlja; Q1 = Opcija A).
 *     Isključuju se po **cijelom tokenu**, jer `dark:[&>svg]:text-slate-50` i
 *     `dark:hover:text-slate-500` ne počinju s `dark:` neposredno ispred `text-`.
 *  2. Parsira se po **tokenima klase** (razdvojeni razmakom unutar stringa), ne regexom
 *     preko cijele linije — `[^>]*` se lomi na `=>` iz arrow-funkcija.
 *
 * Prag: 4.5:1 za tekst. Ispod toga dozvoljeno je samo ono što NIJE tekst (ikone, prag
 * 1.4.11 = 3:1) ili što ne stoji na bijeloj pozadini.
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PALETTE = {
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
  gray: { 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827', 950: '#030712' },
  zinc: { 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b' },
  neutral: { 400: '#a3a3a3', 500: '#737373', 600: '#525252' },
  red: { 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  orange: { 400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  yellow: { 400: '#facc15', 500: '#eab308', 600: '#ca8a04' },
  green: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  teal: { 400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
  cyan: { 500: '#06b6d4', 600: '#0891b2' },
  sky: { 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7' },
  blue: { 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
  indigo: { 500: '#6366f1', 600: '#4f46e5' },
  violet: { 500: '#8b5cf6', 600: '#7c3aed' },
  purple: { 500: '#a855f7', 600: '#9333ea', 900: '#581c87' },
  fuchsia: { 500: '#d946ef' },
  pink: { 500: '#ec4899', 600: '#db2777' },
  stone: { 400: '#a8a29e', 500: '#78716c' },
}

const lin = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const lum = (hex) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}
const contrast = (fg, bg = '#ffffff') => {
  const a = lum(fg)
  const b = lum(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Svaki unos mora imati razlog; ključ je `<fajl>::<klasa>`. */
const ALLOWLIST = {
  'components/ui/badge.tsx::slate-50': 'nebijela pozadina: bg-slate-900 (≈17:1)',
  'features/finance/catalog/category-fields-editor.tsx::rose-500': 'ikona (Trash2), 1.4.11 prag 3:1 — 3.67:1',
  'features/finance/expense/expense-table.tsx::rose-500': 'ikona (Trash2) aria-hidden, 3.67:1 ≥ 3:1',
  'features/finance/expense/line-items-editor.tsx::rose-500': 'ikona (Trash2) aria-hidden, 3.67:1 ≥ 3:1',
  'features/finance/income/income-entries-table.tsx::rose-500': 'ikona (Trash2) aria-hidden, 3.67:1 ≥ 3:1',
  'features/finance/income/integrity-panel.tsx::amber-600': 'ikona aria-hidden, 3.19:1 ≥ 3:1',
  'features/finance/income/integrity-panel.tsx::emerald-600': 'ikona aria-hidden, 3.77:1 ≥ 3:1',
  'features/media-consent/media-consent-panel.tsx::slate-400': 'placeholder-ikona na bg-slate-100, dekorativna',
  'features/settings/settings-module-page.tsx::slate-400': 'ikona (Search) aria-hidden',
  'features/shell/admin/ui/data-state.tsx::rose-500': 'ikona (AlertCircle) aria-hidden, 3.67:1 ≥ 3:1',
  'features/shell/admin/ui/data-state.tsx::slate-400': 'ikona (Inbox) aria-hidden',
  'pages/ClientAnalytics.tsx::amber-400': 'ikona zvijezde (fill) aria-hidden, ima tekstualnu alternativu',
  'pages/ClientAnalytics.tsx::slate-200': 'neoznačena zvijezda, dekorativna',
  'pages/Login.tsx::slate-200': 'tekst na bg-gradient-to-t from-black/80 preko slike',
  'pages/Notifications.tsx::emerald-600': 'ikona u icon-only dugmetu s aria-label, 3.77:1 ≥ 3:1',
  'pages/Register.tsx::slate-200': 'tekst na tamnom overlayu preko slike',
  'pages/Reviews.tsx::emerald-600': 'ikona (Check) aria-hidden, 3.77:1 ≥ 3:1',
  'pages/Reviews.tsx::slate-300': 'neoznačena zvijezda, dekorativna',
  'pages/Reviews.tsx::yellow-400': 'ikona zvijezde (fill) aria-hidden',
  'pages/Salon.tsx::teal-600': 'ikona (Send), 3.74:1 ≥ 3:1',
  'pages/Services.tsx::emerald-600': 'ikona (Plus), 3.77:1 ≥ 3:1',
  'pages/Stylists.tsx::teal-600': 'ikona (Eye), 3.74:1 ≥ 3:1',
  'pages/Users.tsx::slate-400': 'ikona (Search) aria-hidden',
  'pages/Users.tsx::teal-600': 'ikona (Eye) aria-hidden, 3.74:1 ≥ 3:1',
  'pages/public/PublicHome.tsx::slate-200': 'hero tekst na tamnoj sekciji (javni sajt)',
  'pages/public/PublicHome.tsx::slate-400': 'dekorativni vodeni žig na 22% prozirnosti',
  'pages/public/PublicReserve.tsx::slate-400': 'ikona (Search) u polju, dekorativna',
}

const SCAN_DIRS = ['pages', 'features', 'components', 'layouts']
// Dijelovi putanje koji se preskaču (normalizovano na '/'), ne regex nad sirovom putanjom:
// testirana putanja direktorija nema trailing separator, pa regex s njim tiho ne bi matchao.
const EXCLUDE = ['features/blog/', 'features/shell/public/']

const collect = () => {
  const out = []
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e)
      const norm = `${p.split('\\').join('/')}/`
      if (statSync(p).isDirectory()) {
        if (!EXCLUDE.some((frag) => norm.includes(frag))) walk(p)
      } else if (p.endsWith('.tsx')) out.push(p)
    }
  }
  for (const d of SCAN_DIRS) {
    const p = join(SRC, d)
    if (statSync(p).isDirectory()) walk(p)
  }
  return out
}

const scan = () => {
  const names = Object.keys(PALETTE).join('|')
  const tokenRe = new RegExp(`^(?:(?:[\\w[\\]>&~-]+:)*?)text-((?:${names})-\\d{2,3})(?:/\\[[\\d.]+\\])?$`)
  const found = new Map()
  let scanned = 0
  let skippedDark = 0
  for (const file of collect()) {
    const rel = relative(SRC, file).split('\\').join('/')
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const t = line.trim()
      if (t.startsWith('*') || t.startsWith('//') || t.startsWith('{/*')) continue
      for (const str of line.match(/["'`]([^"'`]*)["'`]/g) ?? []) {
        for (const tok of str.slice(1, -1).split(/\s+/)) {
          if (!tok.includes('text-')) continue
          // dark: bilo gdje u prefiksu tokena -> mrtav kod (Q1), ne svjetla upotreba
          if (tok.split('text-')[0].split(':').includes('dark')) {
            skippedDark += 1
            continue
          }
          const m = tokenRe.exec(tok)
          if (!m) continue
          scanned += 1
          const cls = m[1]
          const [pal, shade] = [cls.slice(0, cls.lastIndexOf('-')), Number(cls.slice(cls.lastIndexOf('-') + 1))]
          const hex = PALETTE[pal]?.[shade]
          if (!hex) continue
          if (contrast(hex) >= 4.5) continue
          const key = `${rel}::${cls}`
          found.set(key, (found.get(key) ?? 0) + 1)
        }
      }
    }
  }
  return { found, scanned, skippedDark }
}

test('1.4.3: svaka svjetla tekstualna paleta-klasa ispod 4.5:1 je obrazložena u allowlisti', () => {
  const { found, scanned, skippedDark } = scan()
  // sweep ne smije tiho proći na praznom skupu
  assert.ok(scanned >= 800, `sweep je pregledao samo ${scanned} svjetlih tekstualnih klasa`)
  assert.ok(skippedDark >= 100, `dark: tokena isključeno samo ${skippedDark} — provjera prefiksa je pukla`)

  const missing = [...found.keys()].filter((k) => !ALLOWLIST[k])
  assert.deepEqual(missing, [], `neobrazloženi niskokontrastni nalazi:\n${missing.join('\n')}`)

  const stale = Object.keys(ALLOWLIST).filter((k) => !found.has(k))
  assert.deepEqual(stale, [], `zastarjeli unosi u allowlisti (obrisati):\n${stale.join('\n')}`)
})

test('svaki unos allowliste ima razlog i pokriva stvarni nalaz', () => {
  for (const [key, reason] of Object.entries(ALLOWLIST)) {
    assert.ok(typeof reason === 'string' && reason.length > 12, `${key}: razlog je prekratak`)
    assert.match(key, /^[^:]+\.tsx::[a-z]+-\d{2,3}$/, `${key}: loš format ključa`)
  }
  assert.ok(Object.keys(ALLOWLIST).length >= 20, 'allowlista je sumnjivo mala')
})

test('1.4.3 ispravljeno: statusni tekstovi više ne koriste emerald-600 / amber-600', () => {
  // Tri stvarna prekršaja iz faze 13 (tekst, ne ikona) — vraćanje bi ih moralo srušiti.
  const cases = [
    ['features/stylist-portal/pages/stylist-direct-booking-page.tsx', /text-warn-foreground/, /text-sm text-amber-600/],
    ['features/stylist-workbook/pages/workbook-new-entry-page.tsx', /text-ok-foreground/, /text-xs text-emerald-600/],
    ['pages/Users.tsx', /text-xs text-ok-foreground/, /text-xs text-emerald-600/],
  ]
  for (const [f, must, mustNot] of cases) {
    const src = readFileSync(join(SRC, f), 'utf8')
    assert.match(src, must, `${f}: nedostaje semantički token`)
    assert.doesNotMatch(src, mustNot, `${f}: sirova niskokontrastna klasa se vratila`)
  }
})
