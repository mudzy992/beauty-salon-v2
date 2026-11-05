import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Profile.tsx', import.meta.url), 'utf8')

test('profile page title is a top-level heading', () => {
  assert.match(source, /<h1 className="text-2xl font-semibold tracking-tight text-slate-950">\s*\{t\('profile\.title'\)\}\s*<\/h1>/)
})

test('email verification code input has a localized accessible name', () => {
  assert.match(source, /<Input\s+aria-label=\{t\('profile\.email\.codePlaceholder'\)\}[\s\S]*?placeholder=\{t\('profile\.email\.codePlaceholder'\)\}/)
})

test('profile loading state is exposed as a polite status', () => {
  assert.match(source, /{loading \? \(\s*<div role="status" aria-live="polite"[^>]*>\s*\{t\('common\.loading'\)\}/)
})

test('username availability and checking feedback are announced politely', () => {
  for (const key of ['checking', 'current', 'available', 'unavailable']) {
    assert.match(
      source,
      new RegExp(`<div role="status" aria-live="polite"[^>]*>\\s*\\{t\\('profile\\.username\\.${key}'\\)\\}`),
    )
  }
})
