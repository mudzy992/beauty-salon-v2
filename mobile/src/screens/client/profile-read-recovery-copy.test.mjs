import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const profileTranslations = resource.match(/profile:\s*\{([\s\S]*?)\n\s*\},\n\s*onboarding:/)?.[1]

test('profile read recovery messages have Bosnian resources', () => {
  assert.ok(profileTranslations, 'Missing profile translation resources')
  assert.match(profileTranslations, /debtStale:/)
  assert.match(profileTranslations, /mediaConsent:\s*\{[\s\S]*?stale:/)
})
