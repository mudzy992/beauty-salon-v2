const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** Confirms the exact successful mutation response; other payloads are protocol failures. */
export function isSuccessfulCampaignUnsubscribeResponse(payload) {
  return isRecord(payload) && payload.ok === true && payload.unsubscribed === true
}
