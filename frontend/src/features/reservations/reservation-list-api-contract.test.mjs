import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const apiSource = readFileSync(path.join(here, 'reservation-list.api.ts'), 'utf8')
const calendarSource = readFileSync(path.join(here, '../../pages/ReservationsCalendar.tsx'), 'utf8')

test('admin reservation calendar loads bounded pages for its visible date range', () => {
  assert.match(apiSource, /const PAGE_SIZE = 50/)
  assert.match(apiSource, /const MAX_OFFSET = 1000/)
  assert.match(apiSource, /\.items\.length > PAGE_SIZE/)
  assert.match(apiSource, /params:\s*\{\s*\.\.\.filters,\s*page,\s*pageSize:\s*PAGE_SIZE\s*\}/)
  assert.match(apiSource, /items\.length < total/)
  assert.match(apiSource, /Reservation list exceeds the safe loading limit/)
  assert.match(calendarSource, /fetchAllReservationPages<Reservation>\(range\)/)
  assert.match(calendarSource, /setReservationLoadError\(true\)/)
  assert.match(calendarSource, /onClick=\{\(\) => void loadReservations\(\)\}/)
  assert.doesNotMatch(calendarSource, /api\.get<Reservation\[\].*'\/api\/reservations'/)
})
