export const SALON_TIME_ZONE = 'Europe/Sarajevo';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad2 = (value) => String(value).padStart(2, '0');

const makeUtcDate = (year, monthIndex, day, hour = 12) => {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

export const getDateTimePartsInTimeZone = (
  value = new Date(),
  timeZone = SALON_TIME_ZONE,
) => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError('Expected a valid Date instant.');
  }

  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const parts = Object.fromEntries(
    formatted.map(({ type, value: partValue }) => [type, partValue]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
};

export const formatDateOnlyParts = ({ year, month, day }) =>
  `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;

/** Calendar date of an instant in the salon's business timezone. */
export const getSalonDateOnly = (
  value = new Date(),
  timeZone = SALON_TIME_ZONE,
) => formatDateOnlyParts(getDateTimePartsInTimeZone(value, timeZone));

/** Wall-clock HH:mm of an instant in the salon's business timezone. */
export const getSalonTime = (value = new Date(), timeZone = SALON_TIME_ZONE) => {
  const { hour, minute } = getDateTimePartsInTimeZone(value, timeZone);
  return `${pad2(hour)}:${pad2(minute)}`;
};

export const parseDateOnly = (value) => {
  if (typeof value !== 'string') {
    throw new TypeError('Expected a date-only string in YYYY-MM-DD format.');
  }
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) {
    throw new RangeError('Expected a date-only string in YYYY-MM-DD format.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) {
    throw new RangeError('Invalid calendar date.');
  }
  const date = makeUtcDate(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError('Invalid calendar date.');
  }
  return { year, month, day };
};

const dateOnlyAsUtcNoon = (value) => {
  const { year, month, day } = parseDateOnly(value);
  return makeUtcDate(year, month - 1, day);
};

export const getDateOnlyWeekday = (value) =>
  dateOnlyAsUtcNoon(value).getUTCDay();

export const getDaysInMonth = (year, month) => {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError('Invalid calendar year.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('Invalid calendar month.');
  }
  return makeUtcDate(year, month, 0, 0).getUTCDate();
};

export const addDateOnlyDays = (value, days) => {
  if (!Number.isInteger(days)) throw new RangeError('days must be an integer.');
  const { year, month, day } = parseDateOnly(value);
  const date = makeUtcDate(year, month - 1, day, 0);
  date.setUTCDate(date.getUTCDate() + days);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    throw new RangeError('Resulting date is outside the supported range.');
  }
  return formatDateOnlyParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
};

export const addDateOnlyMonths = (value, months) => {
  if (!Number.isInteger(months)) throw new RangeError('months must be an integer.');
  const { year, month, day } = parseDateOnly(value);
  const monthIndex = year * 12 + month - 1 + months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  if (targetYear < 1 || targetYear > 9999) {
    throw new RangeError('Resulting date is outside the supported range.');
  }
  const targetMonth = targetMonthIndex + 1;
  return formatDateOnlyParts({
    year: targetYear,
    month: targetMonth,
    day: Math.min(day, getDaysInMonth(targetYear, targetMonth)),
  });
};

export const getCurrentMonthRange = (
  value = new Date(),
  timeZone = SALON_TIME_ZONE,
) => {
  const { year, month } = getDateTimePartsInTimeZone(value, timeZone);
  const today = getSalonDateOnly(value, timeZone);
  return {
    fromDate: formatDateOnlyParts({ year, month, day: 1 }),
    toDate: today,
  };
};

export const getCalendarMonthRange = (
  value = new Date(),
  timeZone = SALON_TIME_ZONE,
) => {
  const { year, month } = getDateTimePartsInTimeZone(value, timeZone);
  return {
    fromDate: formatDateOnlyParts({ year, month, day: 1 }),
    toDate: formatDateOnlyParts({
      year,
      month,
      day: getDaysInMonth(year, month),
    }),
  };
};

/** Extract the selected calendar day from a native/browser date-picker Date. */
export const getDateOnlyFromLocalCalendarDate = (value) => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new TypeError('Expected a valid date-picker Date.');
  }
  return formatDateOnlyParts({
    year: value.getFullYear(),
    month: value.getMonth() + 1,
    day: value.getDate(),
  });
};

/** Format a date-only value without converting it through the device timezone. */
export const formatDateOnlyLocale = (value, locale, options = {}) =>
  new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: 'UTC',
    calendar: 'gregory',
    numberingSystem: 'latn',
  }).format(dateOnlyAsUtcNoon(value));

/** Format an instant in the salon's business timezone (not the device zone). */
export const formatInstantDateLocale = (
  value,
  locale,
  options = {},
  timeZone = SALON_TIME_ZONE,
) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new RangeError('Invalid instant');
  }
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
  }).format(date);
};

/** Convert a salon calendar date and wall time to an instant for elapsed-time UI. */
export const salonWallTimeToInstant = (
  dateOnly,
  time,
  timeZone = SALON_TIME_ZONE,
) => {
  const { year, month, day } = parseDateOnly(dateOnly);
  const match = /^(\d{2}):(\d{2})$/.exec(String(time ?? '').slice(0, 5));
  if (!match) throw new RangeError('Expected a wall time in HH:mm format.');
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new RangeError('Invalid wall time.');

  const target = makeUtcDate(year, month - 1, day, 0).getTime() +
    (hour * 60 + minute) * 60_000;
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getDateTimePartsInTimeZone(new Date(instant), timeZone);
    const observed = makeUtcDate(
      parts.year,
      parts.month - 1,
      parts.day,
      0,
    ).getTime() + (parts.hour * 60 + parts.minute) * 60_000;
    const delta = observed - target;
    if (delta === 0) return new Date(instant);
    instant -= delta;
  }

  // A wall time inside the spring-forward gap does not exist. Match the
  // backend policy: move it forward by the gap while preserving its minutes.
  return new Date(instant);
};
