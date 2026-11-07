import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogListScreen.tsx', import.meta.url), 'utf8')
const dailyLogListTranslations = resource.match(/dailyLogList:\s*\{([\s\S]*?)\n\s*\},\n\s*dailyLogDebts:/)?.[1]

test('daily-log list icon actions expose localized button names and hints', () => {
  assert.ok(dailyLogListTranslations, 'Missing mobile daily-log list resources')
  for (const [key, copy] of [
    ['debtsAction', 'Otvori dužnike'],
    ['debtsActionHint', 'Prikazuje listu klijenata s otvorenim dugovanjem.'],
    ['newEntryAction', 'Dodaj novi zapis'],
    ['newEntryActionHint', 'Otvara obrazac za novi zapis dnevnika.'],
  ]) {
    assert.ok(dailyLogListTranslations.includes(`${key}: '${copy}'`), `Missing daily-log action resource: ${key}`)
  }

  assert.match(
    screen,
    /onPress=\{\(\) => router\.push\('\/stylist\/daily-log\/debts'\)\}\s+accessibilityRole="button"\s+accessibilityLabel=\{t\('stylist\.dailyLogList\.debtsAction'\)\}\s+accessibilityHint=\{t\('stylist\.dailyLogList\.debtsActionHint'\)\}/,
  )
  assert.match(
    screen,
    /onPress=\{\(\) => navigation\.navigate\('DailyLogNewEntry'\)\}\s+accessibilityRole="button"\s+accessibilityLabel=\{t\('stylist\.dailyLogList\.newEntryAction'\)\}\s+accessibilityHint=\{t\('stylist\.dailyLogList\.newEntryActionHint'\)\}/,
  )
  assert.match(screen, /\}, \[navigation, colors\.headerText, t\]\)/)
})
