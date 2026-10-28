export function getIntlLocale(
  language: string | null | undefined,
): 'en-GB' | 'bs-BA'
export function formatLocalizedAmount(
  value: number | string,
  language: string | null | undefined,
): string
export function formatMonthName(
  month: number,
  language: string | null | undefined,
): string
export function formatWeekday(
  dayOfWeek: number,
  language: string | null | undefined,
): string
export function formatLocalizedNumber(
  value: number | string,
  language: string | null | undefined,
  options?: Intl.NumberFormatOptions,
): string
export function formatLocalizedDateTime(
  value: Date | string | number,
  language: string | null | undefined,
): string
