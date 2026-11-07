import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8')
const loyaltyInput = screen.match(/<TextInput\s+style=\{\[[\s\S]*?styles\.loyaltyInput[\s\S]*?\n                  \/>/)?.[0]

test('reservation loyalty discount input exposes localized name and service maximum', () => {
  assert.match(resources, /loyaltyDiscountAccessibilityLabel: 'Željeni procenat popusta po programu lojalnosti'/)
  assert.match(resources, /loyaltyDiscountAccessibilityHint: 'Unesite procenat popusta, najviše \{\{maxPercent\}\}% za ovu uslugu\.'/)
  assert.ok(loyaltyInput, 'Reservation loyalty discount input should exist')
  assert.match(loyaltyInput, /accessibilityLabel=\{t\('reservation\.loyaltyDiscountAccessibilityLabel'\)\}/)
  assert.match(loyaltyInput, /accessibilityHint=\{t\('reservation\.loyaltyDiscountAccessibilityHint'/)
  assert.match(loyaltyInput, /maxPercent: loyaltyInfo\.service\.maxDiscountPercent/)
  assert.match(loyaltyInput, /keyboardType="number-pad"/)
})
