export const getIntlLocale = (language) =>
  typeof language === 'string' && language.toLowerCase().startsWith('en')
    ? 'en-GB'
    : 'bs-BA'

export const formatLocalizedAmount = (value, language) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'

  const formattedAmount = new Intl.NumberFormat(getIntlLocale(language), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${formattedAmount} KM`
}
