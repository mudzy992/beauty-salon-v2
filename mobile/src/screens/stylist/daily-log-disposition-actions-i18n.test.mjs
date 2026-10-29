import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const copy = readFileSync(new URL('./disposition-copy.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('./DailyLogDispositionPanel.tsx', import.meta.url), 'utf8')
const menu = readFileSync(new URL('./disposition-action-menu-modal.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const actions = [
  ['reorder', 'dispositionActionReorderLabel', 'Pomjeri termin', 'dispositionActionReorderHint', 'Novi datum i vrijeme se odmah primjenjuju. Klijent dobija obavijest; ne mora potvrđivati.'],
  ['cancel_as_stylist', 'dispositionActionCancelStylistLabel', 'Otkaži u ime salona', 'dispositionActionCancelStylistHint', 'Termin se otkazuje u ime salona. Klijent dobija obavijest. Nema kazne.'],
  ['cancel_as_client', 'dispositionActionCancelClientLabel', 'Otkaži u ime klijenta', 'dispositionActionCancelClientHint', 'Termin se otkazuje u ime klijenta. Klijent dobija obavijest i kaznu.'],
  ['no_show', 'dispositionActionNoShowLabel', 'Označi no-show', 'dispositionActionNoShowHint', 'Klijent se nije pojavio. Dobija obavijest i kaznu.'],
]

test('daily-log disposition action labels and hints resolve through Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [, labelKey, label, hintKey, hint] of actions) {
    assert.ok(dailyLogTranslations.includes(`${labelKey}: '${label}'`), `Missing disposition label resource: ${labelKey}`)
    assert.ok(dailyLogTranslations.includes(`${hintKey}: '${hint}'`), `Missing disposition hint resource: ${hintKey}`)
    assert.ok(copy.includes(`'stylist.dailyLogDetail.${labelKey}'`), `Action label key missing from action map: ${labelKey}`)
    assert.ok(copy.includes(`'stylist.dailyLogDetail.${hintKey}'`), `Action hint key missing from hint map: ${hintKey}`)
  }
  assert.ok(panel.includes('t(DISPOSITION_ACTION_LABEL_KEYS[action])'))
  assert.ok(panel.includes('t(DISPOSITION_ACTION_HINT_KEYS[action])'))
  assert.ok(menu.includes('t(DISPOSITION_ACTION_LABEL_KEYS[key])'))
})

test('disposition actions preserve their keys, ordering, styles, and selection callback', () => {
  assert.match(copy, /export type DispositionAction =\s*\| 'reorder'\s*\| 'cancel_as_client'\s*\| 'cancel_as_stylist'\s*\| 'no_show'/)
  assert.match(copy, /export const DISPOSITION_ACTION_KEYS = Object\.keys\(\s*DISPOSITION_ACTION_LABEL_KEYS,\s*\) as DispositionAction\[\]/)
  assert.match(menu, /variant=\{key === 'no_show' \? 'ghost' : 'outline'\}/)
  assert.match(menu, /onPress=\{\(\) => onSelect\(key\)\}/)
  assert.ok(menu.includes("t('stylist.dailyLogDetail.dispositionCancel')"))
})
