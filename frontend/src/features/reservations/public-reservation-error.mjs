const SIMPLE_ERRORS = new Map([
  ['SERVICE_REQUIRED', 'errorServiceRequired'],
  ['SERVICE_GENDER_MISMATCH', 'errorServiceGenderMismatch'],
  ['Servis nije pronađen.', 'errorServiceUnavailable'],
  ['Odabrani termin nije dostupan.', 'errorSlotUnavailable'],
  ['Idempotency-Key mora biti validan UUID.', 'errorInvalidRequest'],
  [
    'Idempotency-Key je već korišten za drugačiji zahtjev.',
    'errorRequestKeyConflict',
  ],
  ['Datum rezervacije nije validan.', 'errorInvalidDate'],
])

export const resolvePublicReservationError = (message) => {
  if (typeof message !== 'string') return null
  const normalized = message.trim()
  const simpleKey = SIMPLE_ERRORS.get(normalized)
  if (simpleKey) return { key: simpleKey }

  const periodMatch = /^Već imate rezervaciju u tom periodu \((\d{2}:\d{2})–(\d{2}:\d{2})\)\.$/.exec(
    normalized,
  )
  if (periodMatch) {
    return {
      key: 'errorExistingPeriod',
      values: { start: periodMatch[1], end: periodMatch[2] },
    }
  }

  const serviceMatch = /^Već imate rezervaciju za (.+) na odabrani dan\.$/.exec(normalized)
  if (serviceMatch) {
    return { key: 'errorExistingService', values: { service: serviceMatch[1] } }
  }

  const penaltyMatch =
    /^Zbog čestih otkazivanja rezervacija je onemogućena do (\d{4}-\d{2}-\d{2})\.$/.exec(
      normalized,
    )
  if (penaltyMatch) {
    return { key: 'errorPenaltyUntil', values: { date: penaltyMatch[1] } }
  }

  return null
}
