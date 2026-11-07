import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8')

test('home featured-service badge has a Bosnian resource', () => {
  assert.match(resources, /featuredServiceBadge: 'Istaknuto'/)
})

test('home featured-service badge renders the localized resource', () => {
  assert.match(screen, /<Text style=\{styles\.serviceFeaturedBadgeText\}>\{t\('home\.featuredServiceBadge'\)\}<\/Text>/)
  assert.doesNotMatch(screen, /<Text style=\{styles\.serviceFeaturedBadgeText\}>Istaknuto<\/Text>/)
})
