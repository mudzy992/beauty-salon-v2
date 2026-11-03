import assert from 'node:assert/strict';
import test from 'node:test';
import {
  displayDateTimeFieldValue,
  formatDateTimeFieldValue,
  parseDateTimeFieldValue,
} from './date-time-field-value.mjs';

test('date picker values require a valid date-only string and preserve its calendar day', () => {
  const previousTz = process.env.TZ;
  try {
    for (const timeZone of ['UTC', 'Europe/Sarajevo']) {
      process.env.TZ = timeZone;
      const date = parseDateTimeFieldValue('date', '2026-03-29');
      assert.equal(formatDateTimeFieldValue('date', date), '2026-03-29');
      assert.equal(date.getHours(), 12);
    }
  } finally {
    if (previousTz === undefined) delete process.env.TZ;
    else process.env.TZ = previousTz;
  }
});

test('invalid date-only values fall back to the supplied current date and display the placeholder', () => {
  const now = new Date('2026-03-29T10:30:00.000Z');
  for (const value of ['2026-02-30', '2026-13-01', '2026-3-09', '']) {
    assert.equal(parseDateTimeFieldValue('date', value, now).getTime(), now.getTime());
    assert.equal(
      displayDateTimeFieldValue('date', value, 'Odaberite datum', () => 'formatted'),
      'Odaberite datum',
    );
  }
});

test('time picker values validate hour and minute ranges while allowing native seconds', () => {
  const now = new Date('2026-06-15T10:00:00.000Z');
  for (const value of ['09:07', '09:07:00', '09:07:00.123']) {
    const date = parseDateTimeFieldValue('time', value, now);
    assert.equal(formatDateTimeFieldValue('time', date), '09:07');
    assert.equal(displayDateTimeFieldValue('time', value, 'Odaberite vrijeme'), '09:07');
  }

  for (const value of ['24:00', '12:60', '9:07', '09:7', '09:07Z', '']) {
    assert.equal(parseDateTimeFieldValue('time', value, now).getTime(), now.getTime());
    assert.equal(displayDateTimeFieldValue('time', value, 'Odaberite vrijeme'), 'Odaberite vrijeme');
  }
});
