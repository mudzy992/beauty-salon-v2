import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistStatsScreen.tsx', import.meta.url), 'utf8')
const statsTranslations = resource.match(/stats:\s*\{([\s\S]*?)\n\s*\},\n\s*directBooking:/)?.[1]

test('stylist statistics labels use Bosnian translation resources', () => {
  assert.ok(statsTranslations, 'Missing stylist statistics resources')
  for (const key of [
    'noProfileTitle',
    'noProfileMessage',
    'completedReservations',
    'upcomingConfirmed',
    'totalRevenue',
    'serviceRevenue',
    'tips',
    'debts',
  ]) {
    assert.match(statsTranslations, new RegExp(`\\b${key}:`), `Missing stats translation: ${key}`)
    assert.ok(screen.includes(`t('stylist.stats.${key}')`), `Statistics screen missing key: ${key}`)
  }
  assert.doesNotMatch(
    screen,
    /title="Nema profila"|message="Profil stilista nije pronađen\.|Završene rezervacije \(mjesec\)|Predstojeći potvrđeni termini|Ukupan prihod \(dnevna knjiga, mjesec\)|Prihod iz servisa|>Napojnice<|>Dugovi</,
  )
})

test('stylist statistics data calculations and empty-state conditions remain unchanged', () => {
  assert.match(screen, /if \(!profileId\) \{/)
  assert.match(screen, /r\.status === 'COMPLETED'/)
  assert.match(screen, /r\.status === 'CONFIRMED' \|\| r\.status === 'ATTENDANCE_CONFIRMED' \|\| r\.status === 'IN_PROGRESS'/)
  assert.match(screen, /e\.status === 'COMPLETED'/)
  assert.match(screen, /const totalRevenue = serviceRevenue \+ totalTips \+ totalDebts/)
  assert.match(screen, /getServiceAmount\(e\)/)
  assert.match(screen, /getTipAmount\(e\)/)
  assert.match(screen, /getSettledDebtsSum\(e\)/)
  assert.match(screen, /refreshControl=\{/)
})
