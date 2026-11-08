import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const loyaltySummary = screen.match(/loyaltyInfo &&[\s\S]*?t\('reservation\.loyaltyPolicyHint'\)[\s\S]*?<\/Card>/)?.[0]

test('reservation loyalty summary uses localized copy and a semantic heading', () => {
  assert.match(resources, /loyaltyCardHeading: 'Program lojalnosti'/)
  assert.match(resources, /loyaltyStatus: 'Status: \{\{tier\}\} · Bodovi: \{\{points\}\}'/)
  assert.match(resources, /loyaltyNoTier: 'Nema nivoa'/)
  assert.match(resources, /loyaltyMaxDiscount: 'Maks\. popust za ovu uslugu: \{\{percent\}\}% \(≈ \{\{amount\}\} KM\)'/)
  assert.match(resources, /loyaltyMaxPoints: 'Maks\. bodova koje možete iskoristiti: \{\{points\}\}'/)
  assert.match(resources, /loyaltyPolicyHint: 'Stvarni limit zavisi i od globalnih postavki\./)
  assert.ok(loyaltySummary, 'Reservation loyalty summary card should exist')
  assert.match(loyaltySummary, /accessibilityRole="header"/)
  assert.match(loyaltySummary, /t\('reservation\.loyaltyCardHeading'\)/)
  assert.match(loyaltySummary, /t\('reservation\.loyaltyStatus'/)
  assert.match(loyaltySummary, /t\('reservation\.loyaltyMaxDiscount'/)
  assert.match(loyaltySummary, /t\('reservation\.loyaltyMaxPoints'/)
  assert.match(loyaltySummary, /t\('reservation\.loyaltyPolicyHint'\)/)
})
