import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const fallbacks = [
  ['lockErrorFallback', 'Greška pri zaključavanju.'],
  ['unlockErrorFallback', 'Greška pri oslobađanju.'],
  ['acceptErrorFallback', 'Greška pri prihvatanju.'],
  ['rejectErrorFallback', 'Greška pri odbijanju.'],
]

test('stylist inbox action error fallback copy uses Bosnian resources', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  for (const [key, copy] of fallbacks) {
    assert.ok(inboxTranslations.includes(`${key}: '${copy}'`), `Missing inbox error resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.inbox.${key}')`), `Action error missing key: ${key}`)
    assert.ok(!screen.includes(`: '${copy}'`), `Action error fallback remains hard-coded: ${copy}`)
  }
})

test('server error passthrough, first-array-message selection, and error alert title remain unchanged', () => {
  const errorBranches = screen.match(
    /const msg =\s*err && typeof err === 'object' && 'response' in err\s*\?\s*\(err as any\)\.response\?\.data\?\.message\s*:\s*t\('stylist\.inbox\.(?:lock|unlock|accept|reject)ErrorFallback'\);\s*Alert\.alert\(t\('common\.error'\), Array\.isArray\(msg\) \? msg\[0\] : msg\);/g,
  )
  assert.equal(errorBranches?.length, 4, 'Expected all four action handlers to preserve API error passthrough')
  assert.doesNotMatch(screen, /Alert\.alert\('Greška'/)
})
