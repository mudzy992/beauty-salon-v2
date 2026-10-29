import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['manualEntryType', '· Ručno'],
  ['reservationEntryType', '· Rezervacija'],
  ['statusCompleted', 'Završeno'],
  ['statusPending', 'Na čekanju'],
]

test('daily-log header origin and status labels use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing header resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Header missing translation key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `Header copy remains hard-coded: ${copy}`)
  }
  assert.ok(screen.includes("accessibilityLabel={t('stylist.dailyLogDetail.actionsMenuTitle')}"))
  assert.doesNotMatch(screen, /accessibilityLabel="Akcije zapisa"/)
})

test('header still reflects manual/reservation origin and completion state', () => {
  assert.match(screen, /entry\.isManual\s*\? t\('stylist\.dailyLogDetail\.manualEntryType'\)\s*: t\('stylist\.dailyLogDetail\.reservationEntryType'\)/)
  assert.match(screen, /entry\.status === 'COMPLETED'\s*\? t\('stylist\.dailyLogDetail\.statusCompleted'\)\s*: t\('stylist\.dailyLogDetail\.statusPending'\)/)
  assert.match(screen, /setOptions\(\{[\s\S]*?accessibilityLabel=\{t\('stylist\.dailyLogDetail\.actionsMenuTitle'\)\}[\s\S]*?\}, \[colors\.headerText, entry, navigation, openActionsMenu, t\]\)/)
})
