import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/workbook-reschedule-preview-page.tsx', import.meta.url), 'utf8')

test('reschedule proposal loading is announced with localized status text', () => {
  assert.match(source, /if \(loading\) \{[\s\S]*?role="status" aria-live="polite"[\s\S]*?Loader2[\s\S]*?t\('common\.loading'\)/)
})

test('proposal load failures retain their visible retry and back recovery options', () => {
  assert.match(source, /if \(proposalLoadError\)[\s\S]*?role="alert"[\s\S]*?previewLoadFailed[\s\S]*?void fetchProposal\(\)[\s\S]*?navigate\(-1\)/)
})
