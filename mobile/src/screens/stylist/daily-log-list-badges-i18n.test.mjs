import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogListScreen.tsx', import.meta.url), 'utf8')
const dailyLogListTranslations = resource.match(/dailyLogList:\s*\{([\s\S]*?)\n\s*\},\n\s*dailyLogDebts:/)?.[1]

const labels = [
  ['statusCompleted', 'Završeno'],
  ['statusPending', 'Na čekanju'],
  ['beforeAfterLabel', 'Prije i poslije'],
  ['emptyTitle', 'Nema zapisa'],
]

test('daily-log list badge and empty-state labels use Bosnian resources', () => {
  assert.ok(dailyLogListTranslations, 'Missing mobile daily-log list resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogListTranslations.includes(`${key}: '${copy}'`), `Missing daily-log list resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogList.${key}')`), `Daily-log list missing translation key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`) && !screen.includes(`"${copy}"`), `Daily-log list copy remains hard-coded: ${copy}`)
  }
  assert.ok(dailyLogListTranslations.includes("emptyMessage: 'Zapisi iz rezervacija ili ručno dodani pojavit će se ovdje. Završite zapis i dodajte fotografije prije i poslije.'"))
  assert.ok(screen.includes("message={t('stylist.dailyLogList.emptyMessage')}"))
  assert.doesNotMatch(screen, /before\/after|label="B\/A"/i)
})

test('daily-log status badges still distinguish completed and pending entries', () => {
  assert.match(screen, /item\.status === 'COMPLETED'\s*\? t\('stylist\.dailyLogList\.statusCompleted'\)\s*:\s*t\('stylist\.dailyLogList\.statusPending'\)/)
  assert.match(screen, /variant=\{item\.status === 'COMPLETED' \? 'success' : 'warning'\}/)
  assert.match(screen, /hasBA\s*=\s*beforeCount > 0 && afterCount > 0/)
  assert.match(screen, /<Badge label=\{t\('stylist\.dailyLogList\.beforeAfterLabel'\)\} variant="info" \/>/)
})
