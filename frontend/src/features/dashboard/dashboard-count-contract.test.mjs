import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./use-dashboard-data.ts', import.meta.url), 'utf8')

test('dashboard reads an aggregate user count instead of downloading the directory', () => {
  assert.match(
    source,
    /\.get<\{ total\?: number \}>\('\/api\/users\/dashboard-count'\)/,
  )
  assert.match(source, /usersCountRes\.data\?\.total/)
  assert.doesNotMatch(source, /api\.get\(['"]\/api\/users['"]\)/)
  assert.doesNotMatch(source, /asArray\(usersCountRes\.data\)/)
})
