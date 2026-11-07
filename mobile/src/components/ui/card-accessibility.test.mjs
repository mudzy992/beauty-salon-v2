import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const card = readFileSync(new URL('./Card.tsx', import.meta.url), 'utf8');
const services = readFileSync(new URL('../../screens/client/ServicesScreen.tsx', import.meta.url), 'utf8');
const reservation = readFileSync(new URL('../../screens/client/ReservationScreen.tsx', import.meta.url), 'utf8');

test('interactive shared cards forward accessible labels, roles, hints, and state', () => {
  assert.match(card, /accessibilityLabel\?: string/);
  assert.match(card, /accessibilityHint\?: string/);
  assert.match(card, /accessibilityRole\?: AccessibilityRole/);
  assert.match(card, /accessibilityState\?: AccessibilityState/);
  assert.match(card, /<Pressable[\s\S]*?accessibilityRole=\{accessibilityRole\}[\s\S]*?accessibilityLabel=\{accessibilityLabel\}[\s\S]*?accessibilityHint=\{accessibilityHint\}[\s\S]*?accessibilityState=\{accessibilityState\}/);
});

test('multi-select reservation service cards expose checkbox checked state', () => {
  assert.match(reservation, /<Card[\s\S]*?accessibilityRole="checkbox"\s+accessibilityState=\{\{ checked: isSelected \}\}[\s\S]*?onPress=\{\(\) => handleToggleService\(item\)\}/);
});

test('last-used service card contains one button action, not a nested card action', () => {
  assert.match(services, /<Card style=\{styles\.lastUsedCard\}>[\s\S]*?<Button[\s\S]*?title=\{t\('services\.repeatLastUsedService'\)\}[\s\S]*?onPress=\{\(\) =>\s*navigation\.navigate\('ServiceSingleDetail'/);
  assert.doesNotMatch(services, /<Card\s+style=\{styles\.lastUsedCard\}[\s\S]{0,80}onPress=/);
});
