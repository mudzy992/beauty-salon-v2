import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')

const weekdays = [
  ['weekdaySundayShort', 'Ned'],
  ['weekdayMondayShort', 'Pon'],
  ['weekdayTuesdayShort', 'Uto'],
  ['weekdayWednesdayShort', 'Sri'],
  ['weekdayThursdayShort', 'Čet'],
  ['weekdayFridayShort', 'Pet'],
  ['weekdaySaturdayShort', 'Sub'],
]

test('schedule weekday abbreviations use Bosnian translation resources in calendar order', () => {
  for (const [key, label] of weekdays) {
    assert.ok(resource.includes(`${key}: '${label}'`), `Missing weekday translation: ${key}`)
    assert.ok(screen.includes(`t('stylist.schedule.${key}')`), `Schedule missing weekday key: ${key}`)
  }
  assert.match(screen, /const map = \[[\s\S]*?weekdaySundayShort[\s\S]*?weekdayMondayShort[\s\S]*?weekdayTuesdayShort[\s\S]*?weekdayWednesdayShort[\s\S]*?weekdayThursdayShort[\s\S]*?weekdayFridayShort[\s\S]*?weekdaySaturdayShort[\s\S]*?\];/)
  assert.doesNotMatch(screen, /const map = \['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'\]/)
})

test('date-to-weekday index and future section label formatting remain unchanged', () => {
  assert.match(screen, /return map\[getDateOnlyWeekday\(dateStr\)\] \?\? ''/)
  assert.match(screen, /title: `\$\{dayAbbrev\(dateStr\)\} · \$\{formatDate\(dateStr\)\}`/)
  assert.match(screen, /Object\.keys\(futureByDate\)\.sort\(\)/)
})
