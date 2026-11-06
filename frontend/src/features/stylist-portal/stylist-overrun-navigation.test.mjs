import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const actions = readFileSync(new URL('./hooks/use-reservation-detail-actions.ts', import.meta.url), 'utf8')
const preview = readFileSync(new URL('../stylist-workbook/pages/workbook-reschedule-preview-page.tsx', import.meta.url), 'utf8')

test('overrun action navigates directly to the single authoritative proposal read', () => {
  assert.doesNotMatch(actions, /proposeReschedule/)
  assert.match(actions, /const handleOverrun = async \(mode: RescheduleMode, manualShiftMinutes\?: number\) => \{[\s\S]*?setOverrunOpen\(false\)[\s\S]*?new URLSearchParams\(\{ mode, includeBreaks: '0' \}\)[\s\S]*?navigate\([\s\S]*?reschedule-preview\/\$\{reservation\.id\}/)
  assert.match(preview, /const fetchProposal = async \(\) => \{[\s\S]*?await proposeReschedule\(/)
})

test('the preview owns proposal loading failures and retry instead of swallowing them before navigation', () => {
  assert.match(preview, /catch \(err\) \{[\s\S]*?setProposalLoadError\(true\)/)
  assert.match(preview, /if \(proposalLoadError\)[\s\S]*?stylistWorkbook\.reschedule\.previewLoadFailed[\s\S]*?void fetchProposal\(\)/)
})
