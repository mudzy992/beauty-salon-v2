import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const actions = readFileSync(new URL('./hooks/use-reservation-detail-actions.ts', import.meta.url), 'utf8')

// S10 (2026-11-18): pregled promjene termina je podijeljen na stranicu + hook
// + tri komponente. `proposeReschedule` poziv i obrada greške učitavanja
// preselili su se u `hooks/useReschedulePreview.ts`, a stranica ih koristi
// kroz `preview.*`. Provjera se čita nad **oba** fajla — tvrdnja je ista:
// jedno autoritativno čitanje pregleda i vlasništvo nad greškom učitavanja.
const HERE = dirname(fileURLToPath(import.meta.url))
const read = (rel) => readFileSync(resolve(HERE, rel), 'utf8')
const preview = [
  read('../stylist-workbook/pages/workbook-reschedule-preview-page.tsx'),
  read('../stylist-workbook/hooks/useReschedulePreview.ts'),
].join('\n')

test('overrun action navigates directly to the single authoritative proposal read', () => {
  assert.doesNotMatch(actions, /proposeReschedule/)
  assert.match(actions, /const handleOverrun = async \(mode: RescheduleMode, manualShiftMinutes\?: number\) => \{[\s\S]*?setOverrunOpen\(false\)[\s\S]*?new URLSearchParams\(\{ mode, includeBreaks: '0' \}\)[\s\S]*?navigate\([\s\S]*?reschedule-preview\/\$\{reservation\.id\}/)
  assert.match(preview, /const fetchProposal = async \(\) => \{[\s\S]*?await proposeReschedule\(/)
})

test('the preview owns proposal loading failures and retry instead of swallowing them before navigation', () => {
  assert.match(preview, /catch \(err\) \{[\s\S]*?setProposalLoadError\(true\)/)
  assert.match(preview, /if \(preview\.proposalLoadError\)[\s\S]*?stylistWorkbook\.reschedule\.previewLoadFailed[\s\S]*?void preview\.fetchProposal\(\)/)
})
