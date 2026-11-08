import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Users.tsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8')

// ---------------------------------------------------------------------------
// Faza 7 — Korisnici
//
// 2.4.4 / 4.1.2: akcijska dugmad po redu imala su GENERICKA pristupna imena
//   (users.aria.edit / .deactivate / .analytics), pa je svaki red tabele imao
//   isto ime — "Uredi korisnika" x N.
// 1.3.1: 8 <th> bez scope, 0 <caption>.
// 1.4.10: tabela bez data-table klase i bez data-label.
// ---------------------------------------------------------------------------

const headers = source.match(/<th\b[^>]*>/g) || []

test('akcije po redu imaju jedinstvena pristupna imena (2.4.4 / 4.1.2)', () => {
  for (const key of ['analytics', 'edit', 'deactivate']) {
    assert.match(
      source,
      // JSX je `aria-label={t(...)}` — zatvara ga `)}` , ne `))`.
      new RegExp(`aria-label=\\{t\\('users\\.aria\\.${key}', \\{ username: u\\.username \\}\\)\\}`),
      `users.aria.${key} mora nositi username da ime bude jedinstveno po redu`,
    )
  }
  assert.match(
    source,
    /aria-label=\{t\('users\.aria\.resetLink', \{ username: u\.username \}\)\}/,
    'reset-link akcija takodje mora biti jedinstvena po korisniku',
  )
  // nijedna od ovih akcija ne smije ostati genericka
  for (const key of ['analytics', 'edit', 'deactivate']) {
    assert.equal(
      source.includes(`aria-label={t('users.aria.${key}')}`),
      false,
      `users.aria.${key} ne smije ostati bez username`,
    )
  }
})

test('tabela korisnika ima scope i caption (1.3.1)', () => {
  assert.equal(headers.length, 8, 'tacno 8 <th>')
  assert.deepEqual(
    headers.filter((h) => !/scope="col"/.test(h)),
    [],
    'nijedan <th> ne smije ostati bez scope',
  )
  assert.match(source, /<caption className="sr-only">\{t\('users\.caption'\)\}<\/caption>/)
  assert.equal((source.match(/<caption/g) || []).length, 1)
})

test('tabela korisnika opt-in u card mode (1.4.10)', () => {
  assert.match(source, /<table className="app-table data-table w-full border-collapse">/)
  const labels = source.match(/<td data-label=\{t\('([^']+)'\)\}/g) || []
  assert.equal(labels.length, 8, 'tacno 8 <td data-label>')
  assert.equal(
    (source.match(/<td data-label="/g) || []).length,
    0,
    'data-label ne smije biti hardkodovan literal',
  )
  assert.match(css, /table\.data-table tbody td::before/)
})

test('D4 iz plana NIJE prekršaj — Search ikona je dekorativna', () => {
  // Plan je tvrdio da je text-slate-400 na Users.tsx:952 prekršaj 1.4.3.
  // Nije: ikona je aria-hidden i ima tekstualni ekvivalent (placeholder + labela).
  assert.match(
    source,
    /<Search className="[^"]*text-slate-400" aria-hidden="true" \/>/,
    'Search ikona mora ostati aria-hidden (dekorativna, ne tekst)',
  )
})

test('D5 iz plana NIJE prekršaj — role badge nosi tekst, ne samo boju', () => {
  // Plan je tvrdio da su badge-evi samo boja (1.4.1). Nisu: renderuju label.
  assert.match(
    source,
    /<Badge variant=\{getRoleBadgeVariant\(roleName\)\}[^>]*>\s*\{getRoleLabel\(roleName\)\}/,
    'role badge mora renderovati tekstualni label, ne samo boju',
  )
})
