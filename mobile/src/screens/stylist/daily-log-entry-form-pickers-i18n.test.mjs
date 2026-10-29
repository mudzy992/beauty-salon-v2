import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogNewEntryScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['clientLabel', 'Klijent'],
  ['clientPlaceholder', 'Odaberi klijenta'],
  ['serviceLabel', 'Servis'],
  ['serviceSelectNeedsClient', 'Prvo odaberite klijenta'],
  ['selectedServicesCount', '{{count}} servis(a) odabrano'],
  ['servicePlaceholder', 'Odaberi servis(e)'],
]

test('daily-log entry client and service picker copy uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing picker resource: ${key}`)
    const usage = key === 'selectedServicesCount'
      ? "t('stylist.dailyLogDetail.selectedServicesCount', { count: selectedServices.length })"
      : `t('stylist.dailyLogDetail.${key}')`
    assert.ok(screen.includes(usage), `Picker copy does not use ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `Picker copy remains hard-coded: ${copy}`)
  }
  assert.ok(screen.includes("placeholder={t('common.search')}"))
  assert.ok(screen.includes("title={t('common.ok')}"))
  assert.ok(screen.includes("title={t('common.close')}"))
})

test('client/service picker data filtering and selection handlers remain unchanged', () => {
  assert.match(screen, /const baseServices = selectedClient\?\.gender\s*\? services\.filter\(\(s\) => s\.gender === selectedClient\.gender\)\s*: services/)
  assert.match(screen, /const filteredServices = serviceSearch\.trim\(\)[\s\S]*?s\.name\.toLowerCase\(\)\.includes\(serviceSearch\.toLowerCase\(\)\)/)
  assert.match(screen, /setShowClientPicker\(true\)/)
  assert.match(screen, /setShowServicePicker\(true\)/)
  assert.match(screen, /onPress=\{\(\) => toggleService\(item\)\}/)
  assert.match(screen, /onPress=\{\(\) => selectClient\(item\)\}/)
  assert.ok(screen.includes('data={filteredClients.slice(0, 50)}'))
  assert.ok(screen.includes('t(\'stylist.dailyLogDetail.selectedServicesCount\', { count: selectedServices.length })'))
})
