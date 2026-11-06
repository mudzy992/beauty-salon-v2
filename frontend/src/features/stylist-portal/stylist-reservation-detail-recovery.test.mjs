import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/stylist-reservation-detail-page.tsx', import.meta.url), 'utf8')

test('stylist reservation detail announces loading and distinguishes transient read errors from unavailable records', () => {
  assert.match(source, /role="status" aria-live="polite"[\s\S]*?stylistPortal\.reservationDetail\.loading/)
  assert.match(source, /const errorStatus = isAxiosError\(error\) \? error\.response\?\.status : undefined/)
  assert.match(source, /const isUnavailable = errorStatus === 403 \|\| errorStatus === 404/)
  assert.match(source, /if \(error && !reservation && !isUnavailable\)[\s\S]*?role="alert"[\s\S]*?common\.retry[\s\S]*?void refetch\(\)/)
  assert.match(source, /if \(!reservation\) \{[\s\S]*?stylistPortal\.reservationDetail\.notFound/)
})

test('a failed refresh does not replace an already-loaded reservation with an error screen', () => {
  assert.match(source, /if \(error && !reservation && !isUnavailable\)/)
})
