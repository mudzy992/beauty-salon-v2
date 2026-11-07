import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('home featured-service badge has a Bosnian resource', () => {
  assert.match(resources, /featuredServiceBadge: 'Istaknuto'/)
})
