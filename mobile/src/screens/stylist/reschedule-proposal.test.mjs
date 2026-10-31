import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeRescheduleProposal } from './reschedule-proposal.mjs'

const validItem = {
  id: 'reservation-1',
  clientId: 'client-1',
  serviceName: 'Haircut',
  clientName: 'Test Client',
  oldStartTime: '10:00',
  oldEndTime: '11:00',
  newStartTime: '10:15',
  newEndTime: '11:15',
  shiftMinutes: 15,
  reducedBreakMinutes: 0,
}

const validProposal = {
  mode: 'actual_overrun',
  overrunMinutes: 15,
  delayMinutes: 15,
  shiftMinutes: 15,
  includeBreaks: false,
  items: [validItem],
}

test('reschedule proposal normalizer accepts valid empty and populated previews', () => {
  assert.deepEqual(normalizeRescheduleProposal({ delayMinutes: 0, shiftMinutes: 0, items: [] }), {
    delayMinutes: 0,
    shiftMinutes: 0,
    items: [],
  })
  assert.deepEqual(normalizeRescheduleProposal(validProposal), validProposal)
})

test('reschedule proposal normalizer rejects malformed envelope, metrics, and item fields', () => {
  for (const value of [
    null,
    [],
    { delayMinutes: 0, shiftMinutes: 0 },
    { delayMinutes: -1, shiftMinutes: 0, items: [] },
    { delayMinutes: 0, shiftMinutes: Number.NaN, items: [] },
    { delayMinutes: 0, shiftMinutes: 0, mode: 'unknown', items: [] },
    { delayMinutes: 0, shiftMinutes: 0, items: [null] },
    { ...validProposal, items: [{ ...validItem, newStartTime: '25:30' }] },
    { ...validProposal, items: [{ ...validItem, shiftMinutes: -1 }] },
  ]) {
    assert.equal(normalizeRescheduleProposal(value), null)
  }
})
