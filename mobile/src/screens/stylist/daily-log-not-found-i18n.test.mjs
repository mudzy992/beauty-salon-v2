import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('daily-log not-found copy uses the localized message and shared back label', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  assert.ok(dailyLogTranslations.includes("notFound: 'Zapis nije pronađen.'"))
  assert.ok(screen.includes("t('stylist.dailyLogDetail.notFound')"))
  assert.ok(screen.includes("title={t('common.back')}"))
  assert.doesNotMatch(screen, />Zapis nije pronađen\.<|title="Nazad"/)
})

test('not-found state still provides navigation back to the previous screen', () => {
  assert.match(
    screen,
    /if \(!entry\) \{\s*return \(\s*<View[\s\S]*?t\('stylist\.dailyLogDetail\.notFound'\)[\s\S]*?title=\{t\('common\.back'\)\}\s+onPress=\{\(\) => navigation\.goBack\(\)\}/,
  )
})
