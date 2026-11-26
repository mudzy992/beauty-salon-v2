import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

// S10 (2026-11-18): pregled promjene termina je podijeljen na stranicu + hook
// + tri komponente. Tvrdnje su **nepromijenjene** — iste provjere, samo nad
// agregiranim izvorom umjesto nad jednim monolitnim fajlom.
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')
const source = [
  read('pages/workbook-reschedule-preview-page.tsx'),
  read('hooks/useReschedulePreview.ts'),
  read('components/reschedule-options-card.tsx'),
  read('components/reschedule-proposal-list.tsx'),
  read('components/reschedule-confirm-dialog.tsx'),
].join('\n')

test('reschedule proposal loading is announced with localized status text', () => {
  // S10 (2026-11-18): stanje učitavanja sada živi u hooku, pa je uslov na
  // stranici `preview.loading` — semantika se ne mijenja.
  assert.match(source, /if \(preview\.loading\) \{[\s\S]*?role="status" aria-live="polite"[\s\S]*?Loader2[\s\S]*?t\('common\.loading'\)/)
})

test('proposal load failures retain their visible retry and back recovery options', () => {
  assert.match(source, /if \(preview\.proposalLoadError\)[\s\S]*?role="alert"[\s\S]*?previewLoadFailed[\s\S]*?void preview\.fetchProposal\(\)[\s\S]*?navigate\(-1\)/)
})
