import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('mobile daily-log overrun alert copy uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy, placeholders] of [
    ['overrunTitle', 'Kašnjenje termina', []],
    ['overrunReschedulePrompt', 'Želiš li rekalkulaciju budućih termina i preview novog rasporeda?', []],
    ['overrunNotNow', 'Ne sada', []],
    ['overrunWithoutBreaks', 'Bez pauza', []],
    ['overrunWithBreaks', 'Uključi pauze', []],
    ['overrunNoFutureAppointments', 'Ovaj termin je kasnio {{minutes}} min. Nema drugih potvrđenih termina danas za pomjeranje — rekalkulacija rasporeda nije potrebna.', ['{{minutes}}']],
    ['overrunOk', 'U redu', []],
  ]) {
    const entry = dailyLogTranslations.match(new RegExp(`${key}: '([^']*)'`))?.[1]
    assert.ok(entry, `Missing daily-log overrun resource: ${key}`)
    assert.equal(entry, copy, `Unexpected Bosnian overrun copy: ${key}`)
    for (const placeholder of placeholders) {
      assert.ok(entry.includes(placeholder), `Missing ${placeholder} interpolation in ${key}`)
    }
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}'`), `Overrun alert missing translation key: ${key}`)
  }
  assert.doesNotMatch(screen, /'Kašnjenje termina'|'Želiš li rekalkulaciju budućih termina i preview novog rasporeda\?'|'Ne sada'|'Bez pauza'|'Uključi pauze'|'U redu'|`Ovaj termin je kasnio/)
})

test('overrun thresholds, break options, and preview navigation remain unchanged', () => {
  assert.match(screen, /if \(delay > 0 && itemCount > 0\)/)
  assert.match(screen, /else if \(delay > 0 && itemCount === 0\)/)
  assert.match(screen, /Alert\.alert\(\s*t\('stylist\.dailyLogDetail\.overrunTitle'\),\s*t\('stylist\.dailyLogDetail\.overrunReschedulePrompt'\),\s*\[\s*\{ text: t\('stylist\.dailyLogDetail\.overrunNotNow'\), style: 'cancel' \}/)
  assert.match(screen, /text: t\('stylist\.dailyLogDetail\.overrunWithoutBreaks'\)[\s\S]*?includeBreaks: false,[\s\S]*?mode: 'actual_overrun',[\s\S]*?lockMode: true/)
  assert.match(screen, /text: t\('stylist\.dailyLogDetail\.overrunWithBreaks'\)[\s\S]*?includeBreaks: true,[\s\S]*?mode: 'actual_overrun',[\s\S]*?lockMode: true/)
  assert.match(screen, /t\('stylist\.dailyLogDetail\.overrunNoFutureAppointments', \{ minutes: overrunLabel \}\),\s*\[\{ text: t\('stylist\.dailyLogDetail\.overrunOk'\) \}\]/)
  assert.equal((screen.match(/navigation\.navigate\('ReschedulePreview'/g) ?? []).length, 2)
})
