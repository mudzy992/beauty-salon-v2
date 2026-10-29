import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('daily-log image upload fallback uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  assert.ok(dailyLogTranslations.includes("imageUploadErrorFallback: 'Greška pri uploadu.'"))
  assert.ok(screen.includes("t('stylist.dailyLogDetail.imageUploadErrorFallback')"))
  assert.ok(screen.includes("Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : msg)"))
  assert.doesNotMatch(screen, /: 'Greška pri uploadu\.'/)
  assert.doesNotMatch(screen, /Alert\.alert\('Greška', Array\.isArray\(msg\)/)
})

test('server upload errors and array-message selection remain unchanged', () => {
  assert.match(
    screen,
    /err && typeof err === 'object' && 'response' in err\s*\?\s*\(err as any\)\.response\?\.data\?\.message\s*:\s*t\('stylist\.dailyLogDetail\.imageUploadErrorFallback'\);\s*Alert\.alert\(t\('common\.error'\), Array\.isArray\(msg\) \? msg\[0\] : msg\);/,
  )
  assert.match(screen, /await api\.post<\{ id: string \}>\('\/api\/uploads', formData, \{/)
  assert.match(screen, /await api\.post\(`\/api\/daily-log\/\$\{entryId\}\/images`, \{/)
})
