import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('mobile daily-log delete modal copy uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of [
    ['deleteTitle', 'Obriši unos'],
    ['deleteDescription', 'Unos će biti obrisan. Ako je preko ovog unosa naplaćen dug, dug se vraća u status OPEN.'],
    ['deleteReasonLabel', 'Razlog brisanja'],
    ['deleteReasonPlaceholder', 'Npr. greška u unosu'],
    ['deleteCancel', 'Odustani'],
  ]) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing daily-log modal resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Delete modal missing translation key: ${key}`)
    assert.ok(!screen.includes(`>${copy}</Text>`), `Delete modal copy remains hard-coded: ${copy}`)
  }
  assert.ok(screen.includes("t('common.delete')"), 'Delete action should reuse the common delete resource')
})

test('delete modal state, inputs, and actions remain unchanged', () => {
  assert.match(screen, /<Modal visible=\{deleteModalOpen\} animationType="slide" transparent>/)
  assert.match(screen, /label=\{t\('stylist\.dailyLogDetail\.deleteReasonLabel'\)\}[\s\S]*?value=\{deleteReason\}[\s\S]*?onChangeText=\{setDeleteReason\}[\s\S]*?multiline[\s\S]*?placeholder=\{t\('stylist\.dailyLogDetail\.deleteReasonPlaceholder'\)\}/)
  assert.match(screen, /title=\{t\('stylist\.dailyLogDetail\.deleteCancel'\)\}[\s\S]*?variant="outline"[\s\S]*?onPress=\{\(\) => setDeleteModalOpen\(false\)\}/)
  assert.match(screen, /title=\{t\('common\.delete'\)\}[\s\S]*?onPress=\{confirmDelete\}[\s\S]*?loading=\{acting\}/)
})
