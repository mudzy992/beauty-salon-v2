import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const localeSource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');
const screenSource = readFileSync(new URL('./MyReservationsScreen.tsx', import.meta.url), 'utf8');

const keys = [
  'rescheduleAcceptSuccessTitle',
  'rescheduleAcceptSuccessMessage',
  'rescheduleDeclineTitle',
  'rescheduleDeclineMessage',
  'rescheduleDeclineConfirmTitle',
  'rescheduleDeclineConfirmMessage',
  'rescheduleAccept',
  'rescheduleDecline',
  'reschedulePending',
  'reservationFallbackTitle',
  'cancelledForAttendance',
  'estimatedCost',
  'estimatedCostHint',
  'activeTitle',
  'noActiveTitle',
  'noActiveMessage',
];

for (const key of keys) {
  test(`Bosnian My Reservations copy defines ${key}`, () => {
    const match = localeSource.match(new RegExp(`${key}:\\s*'([^']+)'`));
    assert.ok(match, `${key} should be defined in the Bosnian resource`);
    assert.ok(match[1].trim().length > 5, `${key} should contain meaningful copy`);
    assert.ok(screenSource.includes(`t('myReservations.${key}'`), `${key} should be used by MyReservationsScreen`);
  });
}

test('estimated cost copy provides its amount interpolation', () => {
  const match = localeSource.match(/estimatedCost:\s*'([^']+)'/);
  assert.ok(match, 'estimatedCost should be defined');
  assert.match(match[1], /\{\{amount\}\}/);
});
