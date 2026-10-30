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
  assert.ok(screen.includes("getApiErrorMessage(error, t('stylist.dailyLogDetail.imageUploadErrorFallback'))"))
  assert.doesNotMatch(screen, /: 'Greška pri uploadu\.'/)
  assert.doesNotMatch(screen, /Alert\.alert\('Greška', Array\.isArray\(msg\)/)
})

test('upload response is validated and the uploaded media id is reused for association retries', () => {
  assert.match(screen, /await api\.post<unknown>\('\/api\/uploads', formData, \{/)
  assert.match(screen, /if \(!uploadId\) throw new Error/)
  assert.match(screen, /await api\.post\(`\/api\/daily-log\/\$\{entryId\}\/images`, \{/)
  assert.match(screen, /linkUploadedImage\(uploadId, isBefore\)/)
})
