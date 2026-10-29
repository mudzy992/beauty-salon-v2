import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogNewEntryScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const messages = [
  ['editCompletedUnavailable', 'Kompletirani unos se ne može uređivati na mobilnoj.'],
  ['loadErrorFallback', 'Nije moguće učitati unos.'],
  ['profileMissing', 'Profil stilista nije pronađen.'],
  ['clientGenderRequired', 'Odaberite klijenta sa definisanim spolom.'],
  ['serviceRequired', 'Odaberite servis(e).'],
  ['paidAmountInvalid', 'Unesite ispravan iznos naplaćenog računa.'],
  ['settledDebtAmountInsufficient', 'Nedovoljno za naplatu označenih dugova.'],
  ['saveErrorFallback', 'Greška pri kreiranju zapisa.'],
]

test('daily-log entry edit and validation messages use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  assert.ok(resource.includes("info: 'Informacija'"), 'Missing common informational alert title')
  assert.ok(screen.includes("t('common.info')"))
  assert.ok(screen.includes("t('common.error')"))
  assert.ok(screen.includes("t('common.back')"))

  for (const [key, copy] of messages) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing form resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Form copy does not use ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `Form copy remains hard-coded: ${copy}`)
  }
})

test('daily-log entry validation, server error passthrough, and edit/create flows are preserved', () => {
  assert.match(screen, /if \(data\.status === 'COMPLETED'\) \{\s*Alert\.alert\(t\('common\.info'\), t\('stylist\.dailyLogDetail\.editCompletedUnavailable'\)\);\s*navigation\.goBack\(\);\s*return;/)
  assert.match(screen, /catch \{\s*Alert\.alert\(t\('common\.error'\), t\('stylist\.dailyLogDetail\.loadErrorFallback'\)\);\s*navigation\.goBack\(\);/)
  assert.match(screen, /if \(!clientId \|\| !selectedClient\?\.gender\) \{\s*Alert\.alert\(t\('common\.error'\), t\('stylist\.dailyLogDetail\.clientGenderRequired'\)\);\s*return;/)
  assert.match(screen, /if \(serviceIds\.length === 0\) \{\s*Alert\.alert\(t\('common\.error'\), t\('stylist\.dailyLogDetail\.serviceRequired'\)\);\s*return;/)
  assert.match(screen, /if \(!Number\.isFinite\(paidRaw\) \|\| paidRaw < 0\) \{\s*Alert\.alert\(t\('common\.error'\), t\('stylist\.dailyLogDetail\.paidAmountInvalid'\)\);\s*return;/)
  assert.match(screen, /!editEntryId && settleDebtsEnabled && settledDebtIds\.length > 0 && paidRaw < charge\.debtsSum[\s\S]*?t\('stylist\.dailyLogDetail\.settledDebtAmountInsufficient'\)/)
  assert.ok(screen.includes("await api.patch(`/api/daily-log/${editEntryId}`, {"))
  assert.ok(screen.includes("await api.post<{ id: string }>('/api/daily-log', {"))
  assert.match(screen, /'response' in err[\s\S]*?\?\.message\s*:\s*t\('stylist\.dailyLogDetail\.saveErrorFallback'\)/)
  assert.ok(screen.includes("Alert.alert(t('common.error'), Array.isArray(msg) ? msg[0] : String(msg))"))
})
