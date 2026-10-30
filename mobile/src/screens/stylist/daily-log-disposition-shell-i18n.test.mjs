import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('./DailyLogDispositionPanel.tsx', import.meta.url), 'utf8')
const menu = readFileSync(new URL('./disposition-action-menu-modal.tsx', import.meta.url), 'utf8')
const copy = readFileSync(new URL('./disposition-copy.ts', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['dispositionPanelTitle', 'Termin se nije desio / treba drugi slot'],
  ['dispositionPanelHint', 'Naplata je gore: Završi zapis. Ove akcije su izuzeci — otkaz, no-show ili pomjeranje.'],
  ['dispositionOpenMenu', 'Izuzeci (otkaz / no-show / pomjeri)'],
  ['dispositionMenuTitle', 'Izuzeci za rezervaciju'],
  ['dispositionMenuHint', 'Naplata je Završi zapis. Ovdje: otkaz, no-show ili pomjeranje.'],
  ['dispositionActionFallback', 'Akcija'],
]

test('daily-log disposition panel and action-menu shell use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copyText] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copyText}'`), `Missing disposition shell resource: ${key}`)
    assert.ok(panel.includes(`t('stylist.dailyLogDetail.${key}')`) || menu.includes(`t('stylist.dailyLogDetail.${key}')`), `Disposition shell missing key: ${key}`)
    assert.ok(!panel.includes(`'${copyText}'`) && !menu.includes(`'${copyText}'`), `Disposition shell copy remains hard-coded: ${copyText}`)
  }
  assert.doesNotMatch(copy, /DISPOSITION_PANEL_(TITLE|HINT)/)
})

test('disposition panel visibility and menu open/select/close callbacks remain unchanged', () => {
  assert.match(panel, /entry\.status === 'PENDING' &&\s*entry\.reservation\?\.status === 'AWAITING_DAILY_LOG'/)
  assert.match(panel, /<Button title=\{t\('stylist\.dailyLogDetail\.dispositionOpenMenu'\)\}[\s\S]*?onPress=\{\(\) => setMenuOpen\(true\)\}/)
  assert.match(panel, /<DispositionActionMenuModal[\s\S]*?onClose=\{\(\) => setMenuOpen\(false\)\}[\s\S]*?onSelect=\{openAction\}/)
  assert.match(menu, /onPress=\{\(\) => onSelect\(key\)\}/)
  assert.match(menu, /onPress=\{onClose\}/)
})
