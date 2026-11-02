import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./ReschedulePreviewScreen.tsx', import.meta.url), 'utf8')

test('reschedule preview validates responses and retains a matching prior preview on failure', () => {
  assert.match(screen, /api\.post<unknown>\([^\n]*reschedule\/propose/)
  assert.match(screen, /normalizeRescheduleProposal\(data\)/)
  assert.match(screen, /if \(!parsed\) throw new Error\('INVALID_RESCHEDULE_PROPOSAL'\)/)
  assert.match(screen, /requestIdentity\.current\.userId !== userId/)
  assert.match(screen, /requestIdentity\.current\.reservationId !== reservationId/)
  assert.match(screen, /identity\.mounted &&[\s\S]*identity\.generation === generation/)
  assert.match(screen, /identity\.proposalIdentityKey === proposalIdentityKey/)
  assert.match(screen, /if \(!isCurrentRequest\(\)\) return/)
  assert.match(screen, /catch \{\s*if \(isCurrentRequest\(\)\) setLoadError\(true\);\s*\}/)
  assert.doesNotMatch(screen, /catch \{[\s\S]{0,100}setProposal\(null\)/)
  assert.match(screen, /proposalOwnerKey === proposalIdentityKey && proposal !== null/)
  assert.match(screen, /t\(hasCurrentProposal \? 'stylist\.reschedulePreview\.stale' : 'stylist\.reschedulePreview\.loadError'\)/)
  assert.match(screen, /!hasCurrentProposal && \(loading \|\| !loadError\)/)
  assert.match(screen, /!hasChanges && !loadError/)
})

test('reschedule mutation rechecks the preview and identity after user confirmation and every await', () => {
  assert.match(screen, /actionState\.identityKey === expectedIdentityKey/)
  assert.match(screen, /actionState\.proposalOwnerKey === expectedIdentityKey/)
  assert.match(screen, /activeActionRef\.current === null/)
  assert.match(screen, /const action = beginAction\(generation, expectedIdentityKey\)/)
  assert.match(screen, /await api\.post\(`\/api\/reservations\/\$\{reservationId\}\/reschedule\/commit`[\s\S]*?if \(!action\.isCurrent\(\)\) return;/)
  assert.match(screen, /if \(action\.isCurrent\(\)\) \{\s*Alert\.alert\(t\('common\.error'/)
  assert.match(screen, /if \(action\.isCurrent\(\)\) setSubmitting\(false\)/)
  assert.match(screen, /action\.finish\(\)/)
  assert.match(screen, /disabled=\{loading \|\| loadError \|\| !hasCurrentProposal\}/)
  assert.match(screen, /getApiErrorMessage\(err, t\('common\.error'\)\)/)
  assert.match(screen, /requestGeneration\.current \+= 1/)
})
