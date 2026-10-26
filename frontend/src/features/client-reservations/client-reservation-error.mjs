const SIMPLE_ERRORS = new Map([
  ['Rezervacija nije pronađena.', 'errorNotFound'],
  ['Samo klijent može otkazati rezervaciju.', 'errorNotAuthorized'],
  ['Samo klijent može potvrditi dolazak.', 'errorNotAuthorized'],
  ['Rezervacija se više ne može otkazati.', 'errorCannotCancel'],
  ['Rok za otkazivanje je istekao.', 'errorCancelDeadline'],
  [
    'Rezervacija mora biti potvrđena od strane stilista.',
    'errorAwaitingStylist',
  ],
  ['Nema aktivnog zahtjeva za potvrdu termina.', 'errorNoRescheduleRequest'],
  ['Nedostaju predloženi podaci za novi termin.', 'errorIncompleteReschedule'],
  ['Odabrani termin nije dostupan.', 'errorSlotUnavailable'],
  ['Nemate pristup ovoj rezervaciji.', 'errorNotAuthorized'],
])

export const resolveClientReservationError = (message) => {
  if (typeof message !== 'string') return null
  const normalized = message.trim()
  const simpleKey = SIMPLE_ERRORS.get(normalized)
  if (simpleKey) return { key: simpleKey }

  const attendanceDeadlineMatch =
    /^Rok za potvrdu dolaska je istekao \(najkasnije (\d+)h prije termina\)\.$/.exec(
      normalized,
    )
  if (attendanceDeadlineMatch) {
    return {
      key: 'errorAttendanceDeadline',
      values: { hours: attendanceDeadlineMatch[1] },
    }
  }

  return null
}
