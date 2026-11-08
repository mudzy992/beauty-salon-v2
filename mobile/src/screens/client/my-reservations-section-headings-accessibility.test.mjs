import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('./MyReservationsScreen.tsx', import.meta.url), 'utf8')

test('My Reservations active and history groups expose headings', () => {
  const activeHeading = screen.match(/<Text\b[^>]*\baccessibilityRole="header"[^>]*>[\s\S]*?\{t\('myReservations\.activeTitle'\)\}[\s\S]*?<\/Text>/)?.[0]
  const historyHeading = screen.match(/renderSectionHeader=\{\(\{ section: \{ title \} \}\) => \([\s\S]*?<Text\b[^>]*\baccessibilityRole="header"[^>]*>[\s\S]*?\{title\}[\s\S]*?<\/Text>/)?.[0]

  assert.ok(activeHeading, 'active reservation title should be a heading')
  assert.ok(historyHeading, 'upcoming and past section titles should be headings')
})
