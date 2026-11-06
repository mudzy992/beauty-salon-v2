import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./confirm-dialog.tsx', import.meta.url), 'utf8')

test('finance confirmation prevents rapid duplicate confirmations before pending state renders', () => {
  assert.match(source, /const confirmInFlightRef = useRef\(false\)/)
  assert.match(source, /if \(isPending \|\| !isReasonValid \|\| confirmInFlightRef\.current\) return/)
  assert.match(source, /confirmInFlightRef\.current = true[\s\S]*?onConfirm\(reason\.trim\(\)\)/)
  assert.match(source, /disabled=\{isPending \|\| !isReasonValid \|\| confirmInFlightRef\.current\}/)
  assert.match(source, /if \(!open\)[\s\S]*?confirmInFlightRef\.current = false/)
})

test('confirmation exposes pending work as a busy action and polite status', () => {
  assert.match(source, /aria-busy=\{isPending\}/)
  assert.match(source, /isPending \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /isPending\s*\? t\('finance\.confirm\.processing'\)/)
})
