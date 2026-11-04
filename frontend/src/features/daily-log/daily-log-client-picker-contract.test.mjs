import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => readFileSync(path.join(here, relativePath), 'utf8')
const apiSource = read('../../api/daily-log-clients.ts')
const dailyLogDataSource = read('./use-daily-log-data.ts')
const dailyLogDialogSource = read('./entry-form-dialog.tsx')
const workbookApiSource = read('../stylist-workbook/api/stylist-workbook.api.ts')
const mobileScreenSource = read('../../../../mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx')

test('daily-log pickers use bounded CLIENT search requests instead of local full-list filtering', () => {
  assert.match(apiSource, /page: options\.page \?\? 0/)
  assert.match(apiSource, /pageSize: options\.pageSize \?\? 50/)
  assert.match(apiSource, /q: options\.q\?\.trim\(\)/)
  assert.match(dailyLogDataSource, /fetchDailyLogClients\(/)
  assert.match(dailyLogDialogSource, /onSearchClients\(clientSearch\)/)
  assert.match(workbookApiSource, /fetchDailyLogClients\(\{ q, page: 0, pageSize: 50 \}\)/)
  assert.match(mobileScreenSource, /page: 0, pageSize: 50, q: query\.trim\(\)/)
  assert.match(mobileScreenSource, /normalizeDailyLogClientPage\(data\)/)
})
