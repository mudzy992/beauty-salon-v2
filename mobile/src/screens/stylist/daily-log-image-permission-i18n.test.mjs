import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./DailyLogDetailScreen.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('daily-log gallery permission alert uses Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of [
    ['imagePermissionTitle', 'Dozvola'],
    ['imagePermissionMessage', 'Potrebna je dozvola za pristup galeriji.'],
  ]) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing gallery permission resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.dailyLogDetail.${key}')`), `Permission alert missing key: ${key}`)
    assert.ok(!screen.includes(`'${copy}'`), `Permission alert copy remains hard-coded: ${copy}`)
  }
})

test('permission denial still stops before launching the gallery picker', () => {
  assert.match(
    screen,
    /const \{ status \} = await ImagePicker\.requestMediaLibraryPermissionsAsync\(\);\s*if \(status !== 'granted'\) \{\s*Alert\.alert\(\s*t\('stylist\.dailyLogDetail\.imagePermissionTitle'\),\s*t\('stylist\.dailyLogDetail\.imagePermissionMessage'\),\s*\);\s*return;\s*\}\s*const result = await ImagePicker\.launchImageLibraryAsync\(/,
  )
  assert.match(screen, /\[entryId, fetchEntry, t\],\s*\);\s*\n\s*const openActionsMenu/)
})
