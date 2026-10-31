import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ReschedulePreviewScreen.tsx', import.meta.url), 'utf8')

test('reschedule preview validates responses and retains a matching prior preview on failure', () => {
  assert.match(screen, /api\.post<unknown>\([^\n]*reschedule\/propose/)
  assert.match(screen, /normalizeRescheduleProposal\(data\)/)
  assert.match(screen, /if \(!parsed\) throw new Error\('INVALID_RESCHEDULE_PROPOSAL'\)/)
  assert.match(screen, /catch \{\s*if \(generation === requestGeneration\.current\) setLoadError\(true\);\s*\}/)
  assert.doesNotMatch(screen, /catch \{[\s\S]{0,100}setProposal\(null\)/)
  assert.match(screen, /proposalOwnerKey === proposalKey && proposal !== null/)
  assert.match(screen, /t\(hasCurrentProposal \? 'stylist\.reschedulePreview\.stale' : 'stylist\.reschedulePreview\.loadError'\)/)
  assert.match(screen, /!hasChanges && !loadError/)
})

test('reschedule mutation is disabled until the current proposal is valid and fresh', () => {
  assert.match(screen, /if \(loading \|\| loadError \|\| !hasCurrentProposal\) return/)
  assert.match(screen, /disabled=\{loading \|\| loadError \|\| !hasCurrentProposal\}/)
  assert.match(screen, /getApiErrorMessage\(err, t\('common\.error'\)\)/)
  assert.match(screen, /requestGeneration\.current \+= 1/)
})
