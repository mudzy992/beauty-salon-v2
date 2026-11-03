import { parseDateOnly } from '../../../../shared/business-date.mjs';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d{1,3})?)?$/;

const parseWallTime = (value) => {
  if (typeof value !== 'string') return null;
  const match = TIME_PATTERN.exec(value);
  return match ? { hour: Number(match[1]), minute: Number(match[2]) } : null;
};

export const parseDateTimeFieldValue = (mode, value, now = new Date()) => {
  if (mode === 'date') {
    try {
      const { year, month, day } = parseDateOnly(value);
      const date = new Date(0);
      date.setFullYear(year, month - 1, day);
      date.setHours(12, 0, 0, 0);
      return date;
    } catch {
      return new Date(now.getTime());
    }
  }

  const time = parseWallTime(value);
  if (!time) return new Date(now.getTime());
  const date = new Date(now.getTime());
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
};

export const formatDateTimeFieldValue = (mode, date) => {
  const pad = (value) => String(value).padStart(2, '0');
  if (mode === 'date') {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const displayDateTimeFieldValue = (
  mode,
  value,
  placeholder,
  formatDate,
) => {
  if (!value) return placeholder;
  if (mode === 'date') {
    try {
      const { year, month, day } = parseDateOnly(value);
      return formatDate(
        String(day).padStart(2, '0'),
        String(month).padStart(2, '0'),
        String(year),
      );
    } catch {
      return placeholder;
    }
  }
  return parseWallTime(value) ? value.slice(0, 5) : placeholder;
};
