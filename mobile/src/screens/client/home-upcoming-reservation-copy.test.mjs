import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('upcoming reservation accessibility copy includes its service, date, status, and action', () => {
  assert.match(resources, /upcomingReservationTitle: 'Sljedeći termin'/)
  assert.match(
    resources,
    /upcomingReservationAccessibilityLabel: 'Sljedeći termin: \{\{service\}\}, \{\{date\}\}, \{\{status\}\}\.'/,
  )
  assert.match(resources, /upcomingReservationHint: 'Otvara detalje rezervacije\.'/)
})
