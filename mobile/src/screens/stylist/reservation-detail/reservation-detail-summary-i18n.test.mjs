import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../../i18n/bs.ts', import.meta.url), 'utf8')
const summary = readFileSync(new URL('./reservation-detail-summary.tsx', import.meta.url), 'utf8')
const summaryTranslations = resource.match(/summary:\s*\{([\s\S]*?)\n\s*\},\n\s*complete:/)?.[1]

test('stylist reservation summary copy uses Bosnian translation resources', () => {
  assert.ok(summaryTranslations, 'Missing stylist reservation summary resources')
  for (const key of [
    'reservationFallback',
    'minutesShort',
    'estimatedCharge',
    'grossLoyaltyDiscount',
    'payDebtsIntent',
    'rescheduleProposed',
    'clientConfirmationPending',
  ]) {
    assert.match(summaryTranslations, new RegExp(`\\b${key}:`), `Missing summary translation: ${key}`)
    assert.ok(
      summary.includes(`t('stylist.reservationDetail.summary.${key}'`),
      `Summary component missing key: ${key}`,
    )
  }
  assert.doesNotMatch(
    summary,
    /'Rezervacija'| min|Procjenjena naplata|Bruto \$\{|loyalty \$\{|Klijent želi platiti dugovanje|Predloženo pomjeranje:|klijent treba potvrditi/,
  )
})

test('reservation summary values and conditional rows remain unchanged', () => {
  assert.match(summary, /reservation\.publicReferenceCode\?\.trim\(\)/)
  assert.match(summary, /services\[0\]\?\.name/)
  assert.match(summary, /getReservationEstimatedTotal\(reservation\)/)
  assert.match(summary, /Math\.max\(0, estimated - loyaltyAmount\)/)
  assert.match(summary, /getReservationTotalDurationMinutes\(reservation\)/)
  assert.match(summary, /loyaltyAmount > 0 \? \(/)
  assert.match(summary, /reservation\.payDebtsIntent \? \(/)
  assert.match(summary, /reservation\.rescheduleStatus === 'PENDING' \? \(/)
  assert.match(summary, /reservation\.clientNotes \? \(/)
  assert.match(summary, /reservation\.cancelReason \? \(/)
})
