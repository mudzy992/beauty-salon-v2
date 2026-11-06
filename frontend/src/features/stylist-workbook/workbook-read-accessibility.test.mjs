import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const list = readFileSync(new URL('./pages/workbook-list-page.tsx', import.meta.url), 'utf8')
const detail = readFileSync(new URL('./pages/workbook-detail-page.tsx', import.meta.url), 'utf8')

test('workbook list announces profile and entry loading while preserving retryable read errors', () => {
  assert.match(list, /if \(profileLoading\)[\s\S]*?role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(list, /isLoading \? \([\s\S]*?role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(list, /entriesError \? \([\s\S]*?role="alert"[\s\S]*?entriesLoadFailed[\s\S]*?common\.retry/)
})

test('workbook list refresh and retry expose their in-flight state', () => {
  assert.match(list, /disabled=\{isFetching\}[\s\S]*?aria-busy=\{isFetching\}/)
  assert.match(list, /stylistWorkbook\.refreshing/)
})

test('workbook detail announces its loading state and marks refresh as busy', () => {
  assert.match(detail, /if \(isLoading\) \{[\s\S]*?role="status" aria-live="polite"[\s\S]*?common\.loading/)
  assert.match(detail, /disabled=\{isFetching\}[\s\S]*?aria-busy=\{isFetching\}/)
})
