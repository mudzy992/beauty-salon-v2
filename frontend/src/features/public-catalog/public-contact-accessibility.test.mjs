import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/public/PublicContact.tsx', import.meta.url), 'utf8')

test('public contact sections use semantic headings', () => {
  assert.match(source, /<h2 className="text-lg font-semibold tracking-tight text-slate-950 mb-6">\s*\{t\('public\.contact\.formTitle'\)\}\s*<\/h2>/)
  assert.match(source, /<h2 className="text-base font-semibold tracking-tight text-slate-950 mb-4">\s*\{t\('public\.contact\.info'\)\}\s*<\/h2>/)
  for (const section of ['address', 'phone', 'email', 'hours', 'social']) {
    assert.match(source, new RegExp(`<h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">\\s*\\{t\\('public\\.contact\\.${section}'\\)\\}\\s*<\\/h3>`))
  }
})

test('salon-hours loading and failure states have distinct announcements', () => {
  assert.match(source, /hoursLoadError \? \([\s\S]*?<span role="alert">\s*\{t\('public\.contact\.hoursLoadFailed'\)\}/)
  assert.match(source, /hoursLoading \? \([\s\S]*?<span role="status" aria-live="polite">\s*\{t\('public\.contact\.hoursLoading'\)\}/)
  assert.match(source, /onClick=\{\(\) => void loadSalonHours\(\)\}/)
})

test('contact form retains visible labels for all editable fields', () => {
  for (const field of ['fullName', 'email', 'message']) {
    assert.match(source, new RegExp(`<Label htmlFor="${field}"`))
    assert.match(source, new RegExp(`id="${field}"`))
  }
})
