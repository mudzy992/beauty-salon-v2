import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('./DailyLogDispositionPanel.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['dispositionNewDate', 'Novi datum'],
  ['dispositionNewStart', 'Novi početak'],
  ['dispositionNewEnd', 'Novi kraj'],
  ['dispositionReasonLabel', 'Razlog'],
  ['dispositionReasonPlaceholder', 'Obrazloženje'],
  ['dispositionCancel', 'Odustani'],
  ['dispositionConfirm', 'Potvrdi'],
  ['dispositionReorderSuccessTitle', 'Termin pomjeren'],
  ['dispositionReorderSuccessMessage', 'Novi datum i vrijeme su odmah primijenjeni. Klijent je obaviješten i ne mora potvrđivati.'],
  ['dispositionReorderSuccessOk', 'U redu'],
]

test('daily-log disposition reorder dialog and success alert use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing disposition resource: ${key}`)
    assert.ok(panel.includes(`t('stylist.dailyLogDetail.${key}')`), `Disposition UI missing key: ${key}`)
    assert.ok(!panel.includes(`"${copy}"`) && !panel.includes(`'${copy}'`), `Disposition copy remains hard-coded: ${copy}`)
  }
})

test('reorder-only fields, validation, API payload, and success callback remain unchanged', () => {
  assert.match(panel, /action === 'reorder' \? \(\s*<>[\s\S]*?dispositionNewDate[\s\S]*?dispositionNewStart[\s\S]*?dispositionNewEnd[\s\S]*?<\/>/)
  assert.match(panel, /if \(action === 'reorder'\) \{\s*if \(!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test\(targetDate\.trim\(\)\)\) return;/)
  assert.ok(panel.includes("await api.post(`/api/daily-log/${entry.id}/dispose`, {"))
  assert.match(panel, /action,\s*reason: trimmed,/)
  assert.match(panel, /targetDate: action === 'reorder' \? targetDate\.trim\(\) : undefined/)
  assert.match(panel, /if \(action === 'reorder'\) \{\s*Alert\.alert\(\s*t\('stylist\.dailyLogDetail\.dispositionReorderSuccessTitle'\)/)
  assert.match(panel, /dispositionReorderSuccessOk'\), onPress: onDone/)
  assert.match(panel, /\}, \[action, entry\.id, onDone, reason, t, targetDate, targetEndTime, targetStartTime\]\);/)
})
