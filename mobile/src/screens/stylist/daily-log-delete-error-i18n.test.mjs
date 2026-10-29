import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('mobile daily-log deletion validation and fallback copy use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of [
    ['deleteReasonRequired', 'Unesite razlog brisanja.'],
    ['deleteErrorFallback', 'Greška pri brisanju.'],
  ]) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing daily-log resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Delete alert missing translation key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `Delete copy remains hard-coded: ${copy}`)
  }
})

test('delete reason validation, API error passthrough, and successful navigation remain unchanged', () => {
  assert.match(
    screen,
    /const reason = deleteReason\.trim\(\);\s*if \(!reason\) \{\s*Alert\.alert\(t\('common\.error'\), t\('stylist\.dailyLogDetail\.deleteReasonRequired'\)\);\s*return;\s*\}/,
  )
  assert.match(screen, /await api\.delete\(`\/api\/daily-log\/\$\{entryId\}`, \{ data: \{ reason \} \}\)/)
  assert.match(screen, /setDeleteModalOpen\(false\);\s*navigation\.goBack\(\)/)
  assert.match(
    screen,
    /err && typeof err === 'object' && 'response' in err\s*\?\s*\(err as \{ response\?: \{ data\?: \{ message\?: string \| string\[\] \} \} \}\)\.response\?\.data\s*\?\.message\s*:\s*t\('stylist\.dailyLogDetail\.deleteErrorFallback'\)/,
  )
  assert.match(screen, /Alert\.alert\(t\('common\.error'\), Array\.isArray\(msg\) \? msg\[0\] : String\(msg\)\)/)
})
