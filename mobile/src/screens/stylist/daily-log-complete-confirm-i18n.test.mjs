import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('mobile daily-log completion confirmation copy uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of [
    ['completeConfirmTitle', 'Završi zapis'],
    ['completeConfirmWithReservation', 'Označiti zapis kao završen? Ovo će završiti i rezervaciju, te upisati prihod u knjigu.'],
    ['completeConfirmStandalone', 'Označiti zapis kao završen? Prihod će biti upisan u knjigu.'],
    ['completeConfirmCancel', 'Odustani'],
    ['completeConfirmAction', 'Završi'],
  ]) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing completion-confirmation resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Completion alert missing translation key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `Completion-confirmation copy remains hard-coded: ${copy}`)
  }
})

test('reservation-dependent prompt, alert actions, and completion callback remain unchanged', () => {
  assert.match(
    screen,
    /Alert\.alert\(\s*t\('stylist\.dailyLogDetail\.completeConfirmTitle'\),\s*entry\?\.reservationId\s*\? t\('stylist\.dailyLogDetail\.completeConfirmWithReservation'\)\s*:\s*t\('stylist\.dailyLogDetail\.completeConfirmStandalone'\),\s*\[\s*\{ text: t\('stylist\.dailyLogDetail\.completeConfirmCancel'\), style: 'cancel' \},\s*\{\s*text: t\('stylist\.dailyLogDetail\.completeConfirmAction'\),\s*onPress: async \(\) => \{/,
  )
  assert.match(screen, /await api\.post\(`\/api\/daily-log\/\$\{entryId\}\/complete`\);\s*await fetchEntry\(\)/)
  assert.match(screen, /\}, \[entryId, fetchEntry, entry\?\.reservationId, navigation, t\]\);/)
})
