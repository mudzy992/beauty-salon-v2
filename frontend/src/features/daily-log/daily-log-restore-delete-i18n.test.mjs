import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import i18next from 'i18next'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'

const locales = ['bs', 'en'].map((language) =>
  JSON.parse(
    readFileSync(
      new URL('../../i18n/locales/' + language + '.json', import.meta.url),
      'utf8',
    ),
  ),
)
const sources = Object.fromEntries(
  [
    'entry-delete-dialog.tsx',
    'entry-restore-dialog.tsx',
    'use-daily-log-mutations.ts',
  ].map((file) => [
    file,
    readFileSync(new URL('./' + file, import.meta.url), 'utf8'),
  ]),
)
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  )
const getPath = (resource, key) =>
  key.split('.').reduce((value, part) => value?.[part], resource)
const keyReferences = new Set(
  [...Object.values(sources).join('\n').matchAll(/['"](dailyLog(?:\.[\w]+)+)['"]/g)].map(
    ([, key]) => key,
  ),
)
const createI18n = async () => {
  const instance = i18next.createInstance()
  await instance.init({
    lng: 'bs',
    fallbackLng: false,
    resources: {
      bs: { translation: locales[0] },
      en: { translation: locales[1] },
    },
    interpolation: { escapeValue: false },
  })
  return instance
}

test('delete/restore dialogs and feedback have matching BS/EN keys', () => {
  for (const section of ['deleteDialog', 'restoreDialog', 'feedback']) {
    const [bosnian, english] = locales.map((locale) =>
      leafPaths(locale.dailyLog[section], `dailyLog.${section}`).sort(),
    )
    assert.deepEqual(bosnian, english, `BS/EN key mismatch in ${section}`)
  }

  for (const locale of locales) {
    for (const key of keyReferences) {
      assert.notEqual(getPath(locale, key), undefined, `Missing locale key: ${key}`)
    }
  }
})

test('delete/restore copy and original date follow the active language', async () => {
  const instance = await createI18n()
  assert.equal(instance.t('dailyLog.deleteDialog.title'), 'Obriši unos')
  assert.equal(instance.t('dailyLog.restoreDialog.title'), 'Vraćanje zapisa')
  assert.equal(instance.t('dailyLog.feedback.deleted'), 'Unos je obrisan.')

  await instance.changeLanguage('en')
  assert.equal(instance.t('dailyLog.deleteDialog.title'), 'Delete entry')
  assert.equal(instance.t('dailyLog.restoreDialog.title'), 'Restore entry')
  assert.equal(instance.t('dailyLog.feedback.deleted'), 'Entry deleted.')

  const bosnianDate = formatDateOnlyLocale('2024-01-02', getIntlLocale('bs'), {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  const englishDate = formatDateOnlyLocale('2024-01-02', getIntlLocale('en'), {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
  assert.notEqual(bosnianDate, englishDate)
  assert.match(sources['entry-restore-dialog.tsx'], /formatDate\(originalDate, i18n\.language\)/)
  assert.match(sources['entry-restore-dialog.tsx'], /getIntlLocale\(language\)/)
  assert.doesNotMatch(sources['entry-restore-dialog.tsx'], /'bs-BA'/)
})

test('dialog validation, conditional warnings, restore choices and mutation contracts are preserved', () => {
  const deleteDialog = sources['entry-delete-dialog.tsx']
  const restoreDialog = sources['entry-restore-dialog.tsx']
  const mutations = sources['use-daily-log-mutations.ts']

  assert.match(deleteDialog, /entry\?\.status === 'COMPLETED'/)
  assert.match(deleteDialog, /entry\?\.status === 'COMPLETED' && entry\.reservation/)
  assert.match(deleteDialog, /disabled=\{saving \|\| !reason\.trim\(\)\}/)
  assert.match(deleteDialog, /onClick=\{onConfirm\}/)

  assert.match(restoreDialog, /const isFutureDate = \(dateStr: string\)/)
  assert.match(restoreDialog, /const hasReservation = !!entry\.reservation && !entry\.isManual/)
  assert.match(restoreDialog, /hasReservation && !!activeDate && isFutureDate\(activeDate\)/)
  assert.match(restoreDialog, /if \(mode === 'original'\) \{\s*onConfirm\(entry\.id\)/)
  assert.match(restoreDialog, /if \(!newDate\) return/)
  assert.match(restoreDialog, /onConfirm\(entry\.id, newDate\)/)
  assert.match(restoreDialog, /disabled=\{!isValid \|\| loading\}/)

  assert.ok(mutations.includes('await api.post(`/api/daily-log/${id}/complete`)'))
  assert.ok(mutations.includes('await api.delete(`/api/daily-log/${deleteTarget.id}`, {'))
  assert.match(mutations, /data: \{ reason: deleteReason\.trim\(\) \}/)
  assert.ok(mutations.includes('await api.post(`/api/daily-log/${id}/restore`, date ? { date } : {})'))
  for (const key of [
    'completed', 'completeFailed', 'deleted', 'deleteFailed', 'restored', 'restoreFailed',
  ]) {
    assert.ok(mutations.includes(`dailyLog.feedback.${key}`), `Missing feedback key: ${key}`)
  }
})
