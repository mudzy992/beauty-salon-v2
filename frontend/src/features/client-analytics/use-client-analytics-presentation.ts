import { useTranslation } from 'react-i18next'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'

export function useClientAnalyticsPresentation() {
  const { t, i18n } = useTranslation()
  const formatDateOnly = (value: string | null | undefined) =>
    value
      ? formatDateOnlyLocale(value.slice(0, 10), getIntlLocale(i18n.language), {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—'
  const formatInstantDate = (value: string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat(getIntlLocale(i18n.language), { dateStyle: 'medium' }).format(date)
      : '—'
  }
  const getReservationStatusLabel = (status: string) =>
    t(`reservations.statuses.${status}`, { defaultValue: status })
  const getStylistName = (s?: { user?: { firstName: string | null; lastName: string | null; username: string } }) => {
    if (!s?.user) return '-'
    return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username
  }
  const getUserName = (u: { firstName: string | null; lastName: string | null; username: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username

  return { t, formatDateOnly, formatInstantDate, getReservationStatusLabel, getStylistName, getUserName }
}
