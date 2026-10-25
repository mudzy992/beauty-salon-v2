import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addDateOnlyDays,
  addDateOnlyMonths,
  formatDateOnlyLocale,
  formatInstantDateLocale,
  getCalendarMonthRange,
  getCurrentMonthRange,
  getDateOnlyWeekday,
  getDateTimePartsInTimeZone,
  getSalonDateOnly,
  getSalonTime,
  salonWallTimeToInstant,
} from './business-date.mjs';

test('salon date and wall time are independent of the process timezone', () => {
  const instant = new Date('2026-01-14T23:30:00.000Z');
  const original = process.env.TZ;
  try {
    process.env.TZ = 'UTC';
    assert.equal(getSalonDateOnly(instant), '2026-01-15');
    assert.equal(getSalonTime(instant), '00:30');

    process.env.TZ = 'Europe/Sarajevo';
    assert.equal(getSalonDateOnly(instant), '2026-01-15');
    assert.equal(getSalonTime(instant), '00:30');
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('salon month ranges follow the business date across local midnight', () => {
  const justAfterSalonMidnight = new Date('2026-03-31T22:30:00.000Z');
  assert.deepEqual(getCurrentMonthRange(justAfterSalonMidnight), {
    fromDate: '2026-04-01',
    toDate: '2026-04-01',
  });
  assert.deepEqual(getCalendarMonthRange(justAfterSalonMidnight), {
    fromDate: '2026-04-01',
    toDate: '2026-04-30',
  });
});

test('date-only arithmetic clamps month ends and crosses leap/DST calendar boundaries', () => {
  assert.equal(addDateOnlyDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDateOnlyDays('2024-02-29', 1), '2024-03-01');
  assert.equal(addDateOnlyDays('2026-03-28', 2), '2026-03-30');
  assert.equal(addDateOnlyMonths('2026-03-31', -1), '2026-02-28');
  assert.equal(getDateOnlyWeekday('2026-03-29'), 0);
  assert.equal(
    formatDateOnlyLocale('2026-03-29', 'bs-BA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    'nedjelja, 29. mart',
  );
});

test('spring-forward gap and fall-back overlap have explicit wall-time behavior', () => {
  const beforeGap = new Date('2026-03-29T00:30:00.000Z');
  const afterGap = new Date('2026-03-29T01:30:00.000Z');
  assert.equal(getSalonTime(beforeGap), '01:30');
  assert.equal(getSalonTime(afterGap), '03:30');

  const firstRepeatedTime = new Date('2026-10-25T00:30:00.000Z');
  const secondRepeatedTime = new Date('2026-10-25T01:30:00.000Z');
  assert.equal(getSalonTime(firstRepeatedTime), '02:30');
  assert.equal(getSalonTime(secondRepeatedTime), '02:30');
  assert.equal(
    salonWallTimeToInstant('2026-10-25', '02:30').toISOString(),
    '2026-10-25T01:30:00.000Z',
  );
  const springGapInstant = salonWallTimeToInstant('2026-03-29', '02:30');
  assert.equal(springGapInstant.toISOString(), '2026-03-29T01:30:00.000Z');
  assert.equal(getSalonTime(springGapInstant), '03:30');
  assert.deepEqual(getDateTimePartsInTimeZone(springGapInstant), {
    year: 2026,
    month: 3,
    day: 29,
    hour: 3,
    minute: 30,
  });
});

test('date-only and instant formatters ignore the device timezone', () => {
  const instant = new Date('2026-01-14T23:30:00.000Z');
  const original = process.env.TZ;
  const results = [];
  try {
    for (const timeZone of ['UTC', 'Europe/Sarajevo']) {
      process.env.TZ = timeZone;
      results.push(
        formatDateOnlyLocale('2026-01-15', 'en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
        formatInstantDateLocale(instant, 'en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
  assert.deepEqual(results, [
    '15/01/2026',
    '15/01/2026',
    '15/01/2026',
    '15/01/2026',
  ]);
});

test('date-only formatting rejects impossible calendar values', () => {
  assert.throws(() => addDateOnlyDays('2026-02-30', 1), /Invalid calendar date/);
  assert.throws(() => addDateOnlyMonths('2026-13-01', 1), /Invalid calendar date/);
});
