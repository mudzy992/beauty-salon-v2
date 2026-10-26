export const getIntlLocale = (language) =>
  typeof language === 'string' && language.toLowerCase().startsWith('en')
    ? 'en-GB'
    : 'bs-BA'

export const formatLocalizedNumber = (value, language, options = {}) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat(getIntlLocale(language), options).format(amount)
}

export const formatLocalizedAmount = (value, language) => {
  const formattedAmount = formatLocalizedNumber(value, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formattedAmount === '—' ? formattedAmount : `${formattedAmount} KM`
}

export const formatLocalizedDateTime = (value, language) => {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'

  return new Intl.DateTimeFormat(getIntlLocale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export const formatWeekday = (dayOfWeek, language) => {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return ''
  const date = new Date(Date.UTC(2024, 0, 7 + dayOfWeek))
  return new Intl.DateTimeFormat(getIntlLocale(language), {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(date)
}
