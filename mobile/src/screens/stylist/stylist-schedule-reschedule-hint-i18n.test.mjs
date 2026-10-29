import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')

test('pending reschedule hint uses the stylist schedule resource', () => {
  assert.match(resource, /pendingRescheduleHint:\s*'Klijent treba potvrditi novi termin'/)
  assert.match(screen, /t\('stylist\.schedule\.pendingRescheduleHint'\)/)
  assert.doesNotMatch(screen, /Klijent treba potvrditi novi termin/)
})

test('pending reschedule hint condition and row presentation remain unchanged', () => {
  assert.match(screen, /item\.rescheduleStatus === 'PENDING' && \(/)
  assert.match(screen, /<Ionicons name="alert-circle-outline" size=\{15\} color=\{gold\} \/>/)
  assert.match(screen, /<Text style=\{\[styles\.client, styles\.subtleOverlay\]\}>\s*\{t\('stylist\.schedule\.pendingRescheduleHint'\)\}/)
})
