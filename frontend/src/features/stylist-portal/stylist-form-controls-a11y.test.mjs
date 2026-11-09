/**
 * Faza 11 — WCAG 4.1.2 (Name, Role, Value) i 1.3.1 na svim obrascima stylist portala
 *
 * Sistematski sweep (ne samo stavke iz plana): svaka `<Input>` / `<Textarea>` u
 * `features/stylist-portal` i `features/stylist-workbook` mora imati **ime** —
 * `aria-label` ili `<Label htmlFor>` koji pokazuje na njen `id`.
 *
 * Nalaz iz izvora: `workbook-reschedule-preview-page.tsx:212` je imao orphan `<Label>`
 * (bez `htmlFor`) uz `<Input>` bez `id`-a i bez `aria-label` — label nije imenovao ništa.
 *
 * ⚠️ Regex mora prepoznavati **oba** oblika id-a: `id={izraz}` i `id="literal"`.
 * Prva verzija ovog sweepa je prepoznavala samo `id={…}` i dala **21 lažno pozitivnih**
 * od 27 kontrola (npr. `<Textarea id="cancelReason">` uz `<Label htmlFor="cancelReason">`).
 * Zato test broji i ukupan broj provjerenih kontrola — da tiho ne „prođe" na praznom skupu.
 *
 * Bez browsera: izvorni ugovor.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

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

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const audit = () => {
  const rows = []
  for (const f of SRC) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/<(Input|Textarea)\b((?:"[^"]*"|[^>"])*?)\/?>/gs)) {
      const [, tag, attrs] = m
      const line = src.slice(0, m.index).split('\n').length
      if (attrs.includes('aria-label')) {
        rows.push({ f, line, tag, ok: true, how: 'aria-label' })
        continue
      }
      const idm = /id=(?:\{([^}]+)\}|"([^"]+)")/.exec(attrs)
      if (!idm) {
        rows.push({ f, line, tag, ok: false, how: 'nema id' })
        continue
      }
      const ident = (idm[1] ?? idm[2]).trim()
      const labelRe = new RegExp(`htmlFor=(?:\\{\\s*${escapeRe(ident)}\\s*\\}|"${escapeRe(ident)}")`)
      rows.push({
        f,
        line,
        tag,
        ok: labelRe.test(src),
        how: labelRe.test(src) ? `Label htmlFor=${ident}` : `id=${ident} bez labela`,
      })
    }
  }
  return rows
}

test('4.1.2/1.3.1: svaka kontrola u stylist portalu ima ime', () => {
  const rows = audit()
  // 27 je izmjereni broj kontrola — da sweep ne „prođe" ako regex prestane matchovati
  assert.ok(rows.length >= 27, `ocekivano >=27 kontrola, nadeno ${rows.length}`)

  const orphans = rows.filter((r) => !r.ok).map((r) => `${rel(r.f)}:${r.line} <${r.tag}> (${r.how})`)
  assert.deepEqual(orphans, [], `kontrole bez imena:\n  ${orphans.join('\n  ')}`)
})

test('nema orphan <Label> (label bez htmlFor ne imenuje ništa)', () => {
  const orphans = []
  for (const f of SRC) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/<Label\b([^>]*)>/g)) {
      const attrs = m[1]
      if (attrs.includes('htmlFor')) continue
      // <Label> koji omata kontrolu je takodje validan — ali ovdje ga nema
      const after = src.slice(m.index, m.index + 400)
      if (!/<(Input|Textarea|Select|Switch)\b/.test(after.split('</Label>')[0] ?? '')) {
        orphans.push(`${rel(f)}:${src.slice(0, m.index).split('\n').length}`)
      }
    }
  }
  assert.deepEqual(orphans, [], `orphan labeli: ${orphans.join(', ')}`)
})

test('manualShift polje: id i htmlFor su upareni preko useId', () => {
  const src = readFileSync(
    join(root, 'features/stylist-workbook/pages/workbook-reschedule-preview-page.tsx'),
    'utf8',
  )
  assert.match(src, /import \{ useEffect, useId, useMemo, useState \} from 'react'/)
  assert.match(src, /const manualShiftId = `\$\{formId\}-manual-shift`/)
  assert.match(src, /<Label htmlFor=\{manualShiftId\}>\{t\('stylistWorkbook\.reschedule\.manualShift'\)\}<\/Label>/)
  assert.match(src, /<Input\s+id=\{manualShiftId\}/)
})
