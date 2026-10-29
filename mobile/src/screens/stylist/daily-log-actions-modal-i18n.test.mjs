import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const modal = readFileSync(new URL('./daily-log-entry-actions-modal.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const labels = [
  ['actionsMenuTitle', 'Akcije zapisa'],
  ['actionsMenuEdit', 'Uredi unos'],
  ['actionsMenuAddBeforePhoto', 'Dodaj sliku prije'],
  ['actionsMenuAddAfterPhoto', 'Dodaj sliku poslije'],
  ['actionsMenuDelete', 'Obriši unos'],
  ['actionsMenuCancel', 'Odustani'],
]

test('daily-log actions modal labels use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of labels) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing action menu resource: ${key}`)
    assert.ok(modal.includes(`t('stylist.dailyLogDetail.${key}')`), `Modal missing translation key: ${key}`)
    assert.ok(!modal.includes(`"${copy}"`) && !modal.includes(`>${copy}<`), `Action label remains hard-coded: ${copy}`)
  }
})

test('localized labels remain bound to the same action callbacks', () => {
  assert.match(modal, /title=\{t\('stylist\.dailyLogDetail\.actionsMenuEdit'\)\}[\s\S]*?onPress=\{onEdit\}/)
  assert.match(modal, /title=\{t\('stylist\.dailyLogDetail\.actionsMenuAddBeforePhoto'\)\}[\s\S]*?onPress=\{onAddBeforePhoto\}/)
  assert.match(modal, /title=\{t\('stylist\.dailyLogDetail\.actionsMenuAddAfterPhoto'\)\}[\s\S]*?onPress=\{onAddAfterPhoto\}/)
  assert.match(modal, /title=\{t\('stylist\.dailyLogDetail\.actionsMenuDelete'\)\}[\s\S]*?onPress=\{onDelete\}/)
  assert.match(modal, /title=\{t\('stylist\.dailyLogDetail\.actionsMenuCancel'\)\}[\s\S]*?onPress=\{onClose\}/)
})
