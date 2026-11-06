import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Login.tsx', import.meta.url), 'utf8')

test('login page exposes one semantic primary heading and associated credential labels', () => {
  assert.equal([...source.matchAll(/<h1\b/g)].length, 1)
  assert.match(source, /<h1 className="text-2xl font-semibold text-slate-900">\s*\{t\('auth\.login'\)\}\s*<\/h1>/)
  assert.match(source, /<Label htmlFor="usernameOrEmail">[\s\S]*?<Input\s+id="usernameOrEmail"/)
  assert.match(source, /<Label htmlFor="password">[\s\S]*?<Input\s+id="password"/)
})

test('login form and submit control expose busy state and announce loading', () => {
  assert.match(source, /<form onSubmit=\{handleSubmit\} className="space-y-5" aria-busy=\{loading\}>/)
  assert.match(source, /type="submit"[\s\S]*?disabled=\{loading\}[\s\S]*?aria-busy=\{loading\}/)
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.loading'\)\}/)
})

test('login submission prevents duplicates and ignores results after unmount', () => {
  assert.match(source, /if \(loginRequestInFlight\.current\) return/)
  assert.match(source, /const generation = \+\+loginRequestGeneration\.current/)
  assert.match(source, /if \(generation !== loginRequestGeneration\.current\) return/)
  assert.match(source, /loginRequestGeneration\.current \+= 1/)
})

test('login navigation uses a single styled link control', () => {
  assert.match(source, /<Button asChild variant="ghost" className="mb-8">\s*<Link to="\/">\{t\('auth\.backHome'\)\}<\/Link>\s*<\/Button>/)
  assert.doesNotMatch(source, /<Link[^>]*>\s*<Button/)
})
