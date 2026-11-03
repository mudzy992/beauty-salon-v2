import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./lookups.api.ts', import.meta.url), 'utf8')

test('finance client search uses the bounded CLIENT picker contract', () => {
  assert.ok(
    source.includes('api.get<{ items?: ClientOption[] }>(\n    "/api/users/clients",'),
  )
  assert.match(
    source,
    /params:\s*\{\s*page:\s*0,\s*pageSize:\s*20,\s*q:\s*query\.trim\(\)\s*\|\|\s*undefined\s*\}/,
  )
  assert.match(
    source,
    /Array\.isArray\(data\?\.items\)\s*\?\s*data\.items\s*:\s*\[\]/,
  )
  assert.doesNotMatch(source, /search:\s*query|role:\s*['"]CLIENT['"]|limit:\s*20/)
})
