import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('mobile daily-log completion API fallback uses a Bosnian resource', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  assert.ok(dailyLogTranslations.includes("completeErrorFallback: 'Greška.'"))
  assert.ok(screen.includes("t('stylist.dailyLogDetail.completeErrorFallback')"))
  assert.doesNotMatch(screen, /: 'Greška\.'/)
})

test('server error passthrough, array-message selection, and completion flow remain unchanged', () => {
  assert.match(
    screen,
    /err && typeof err === 'object' && 'response' in err\s*\?\s*\(err as any\)\.response\?\.data\?\.message\s*:\s*t\('stylist\.dailyLogDetail\.completeErrorFallback'\);\s*Alert\.alert\(t\('common\.error'\), Array\.isArray\(msg\) \? msg\[0\] : msg\);/,
  )
  assert.match(screen, /await api\.post\(`\/api\/daily-log\/\$\{entryId\}\/complete`\);\s*await fetchEntry\(\)/)
  assert.match(screen, /\}, \[entryId, fetchEntry, entry\?\.reservationId, navigation, t\]\);/)
})
