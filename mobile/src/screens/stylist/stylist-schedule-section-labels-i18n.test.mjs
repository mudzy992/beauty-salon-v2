import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')

test('stylist schedule section headings use Bosnian translation resources', () => {
  assert.match(resource, /todaySection:\s*'Danas'/)
  assert.match(resource, /completedCanceledTodaySection:\s*'Završeni \/ otkazani \(danas\)'/)
  assert.match(screen, /title: t\('stylist\.schedule\.todaySection'\)/)
  assert.match(screen, /title: t\('stylist\.schedule\.completedCanceledTodaySection'\)/)
  assert.doesNotMatch(screen, /title: 'Danas'|title: 'Završeni \/ otkazani \(danas\)'/)
})

test('schedule section membership and date-group labels are unchanged', () => {
  assert.match(screen, /if \(visibleReservations\.length === 0\) return \[\]/)
  assert.match(screen, /if \(d === todayStr\)/)
  assert.match(screen, /completedLikeStatuses\.has\(r\.status\)/)
  assert.match(screen, /if \(todayCompletedLike\.length > 0\)/)
  assert.match(screen, /const sortedFutureDates = Object\.keys\(futureByDate\)\.sort\(\)/)
  assert.match(screen, /title: `\$\{dayAbbrev\(dateStr\)\} · \$\{formatDate\(dateStr\)\}`/)
  assert.match(screen, /\}, \[visibleReservations, t\]\)/)
})
