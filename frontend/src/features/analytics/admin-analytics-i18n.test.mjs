import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(readFileSync(new URL('../../i18n/locales/' + language + '.json', import.meta.url), 'utf8')),
)
const source = readFileSync(new URL('../../pages/Analytics.tsx', import.meta.url), 'utf8')
const literalKeys = new Set([...source.matchAll(/\bt\('([^']+)'/g)].map(([, key]) => key))
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )

test('admin analytics UI references keys in both locales', () => {
  assert.ok(literalKeys.size > 0)
  const [bosnian, english] = locales.map((resource) => {
    const keys = leafPaths(resource.adminAnalytics, 'adminAnalytics').sort()
    for (const key of literalKeys) {
      if (key.startsWith('adminAnalytics.')) {
        assert.ok(keys.includes(key), `Missing analytics locale key: ${key}`)
      }
    }
    return keys
  })
  assert.deepEqual(bosnian, english)
  assert.match(source, /formatDateOnlyLocale\(data\.fromDate, i18n\.language\)/)
  assert.match(source, /formatLocalizedAmount\(data\.periodFinance\.totalIncome, i18n\.language\)/)
  assert.match(source, /new Intl\.DateTimeFormat\(getIntlLocale\(i18n\.language\)/)
})

test('analytics date presets and dashboard request contract remain unchanged', () => {
  assert.match(source, /api\s*\.get<AnalyticsDashboard>\('\/api\/analytics\/dashboard', \{ params \}\)/)
  assert.match(source, /if \(preset === '12'\) return \{ monthsBack: '12' \}/)
  assert.match(source, /if \(preset === 'thisMonth'\) \{\s*return \{ year: String\(current\.year\), month: String\(current\.month\) \}/)
  assert.match(source, /if \(preset === 'custom' && customFrom && customTo\) return \{ fromDate: customFrom, toDate: customTo \}/)
  assert.match(source, /\.catch\(\(\) => setData\(null\)\)/)
})

test('dynamic financial categories, stylist and service names stay data', () => {
  assert.match(source, /\{row\.categoryName\}/)
  assert.match(source, /\{s\.stylistName\}/)
  assert.match(source, /\{s\.serviceName\}/)
  assert.match(source, /to=\{`\/admin\/stylist-analytics\?stylistId=\$\{s\.stylistProfileId\}`\}/)
  assert.match(source, /dataKey="label"/)
})
