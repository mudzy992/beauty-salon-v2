import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistScheduleScreen.tsx', import.meta.url), 'utf8')
const scheduleTranslations = resource.match(/schedule:\s*\{([\s\S]*?)\n\s*\},\n\s*\},\n\};/)?.[1]

test('stylist schedule empty-state copy uses Bosnian resources', () => {
  assert.ok(scheduleTranslations, 'Missing stylist schedule resources')
  for (const key of ['noProfileTitle', 'noProfileMessage', 'emptyTitle', 'emptyMessage']) {
    assert.match(scheduleTranslations, new RegExp(`\\b${key}:`), `Missing schedule translation: ${key}`)
    assert.ok(screen.includes(`t('stylist.schedule.${key}')`), `Schedule screen missing key: ${key}`)
  }
  assert.doesNotMatch(screen, /Nema profila|Profil stilista nije pronađen\.|Nema termina|Trenutno nema termina za prikaz\./)
})

test('schedule profile and reservation empty-state conditions remain unchanged', () => {
  assert.match(screen, /if \(!profileId\) \{/)
  assert.match(screen, /<EmptyState\s+icon="calendar-outline"\s+title=\{t\('stylist\.schedule\.noProfileTitle'\)\}/)
  assert.match(screen, /ListEmptyComponent=\{\s*<EmptyState/)
  assert.match(screen, /title=\{t\('stylist\.schedule\.emptyTitle'\)\}/)
  assert.match(screen, /refreshControl=\{/)
})
