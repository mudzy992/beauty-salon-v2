import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./utils/stylist-schedule-sections.ts', import.meta.url), 'utf8')

test('schedule sectioning keeps only today/future reservations and groups future dates', () => {
  assert.match(source, /const todayStr = getSalonDateOnly\(\)/)
  assert.match(source, /if \(date === todayStr\) today\.push\(reservation\)/)
  assert.match(source, /else if \(date > todayStr\)/)
  assert.match(source, /Object\.keys\(futureByDate\)[\s\S]*?\.sort\(\)/)
})

test('within-day order keeps status priority followed by start time', () => {
  assert.match(source, /IN_PROGRESS: 0[\s\S]*?ATTENDANCE_CONFIRMED: 1[\s\S]*?CONFIRMED: 2[\s\S]*?NO_SHOW: 8/)
  assert.match(source, /if \(ao !== bo\) return ao - bo/)
  assert.match(source, /if \(a\.startTime !== b\.startTime\) return a\.startTime < b\.startTime \? -1 : 1/)
})
