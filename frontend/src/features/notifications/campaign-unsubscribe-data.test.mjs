import assert from 'node:assert/strict'
import test from 'node:test'

import { isSuccessfulCampaignUnsubscribeResponse } from './campaign-unsubscribe-data.mjs'

test('campaign unsubscribe parser accepts only the explicit successful response', () => {
  assert.equal(isSuccessfulCampaignUnsubscribeResponse({ ok: true, unsubscribed: true }), true)
  assert.equal(isSuccessfulCampaignUnsubscribeResponse({ ok: true, unsubscribed: false }), false)
  assert.equal(isSuccessfulCampaignUnsubscribeResponse({ unsubscribed: true }), false)
  assert.equal(isSuccessfulCampaignUnsubscribeResponse(null), false)
  assert.equal(isSuccessfulCampaignUnsubscribeResponse([]), false)
})
