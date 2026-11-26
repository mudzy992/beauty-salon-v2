import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import {
  getStylistScheduleWindow,
  useStylistScheduleReservations,
} from '../hooks/useStylistReservations'
import { StylistScheduleReservationCard } from '../components/stylist-schedule-reservation-card'
import { buildStylistScheduleSections } from '../utils/stylist-schedule-sections'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'
import { getIntlLocale } from '../../../i18n/locale-utils.mjs'

const formatDate = (iso: string, locale: string) =>
  formatDateOnlyLocale(iso.slice(0, 10), locale, {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

export const StylistSchedulePage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const { reservations, isLoading, isFetching, error, refetch } = useStylistScheduleReservations({
    stylistProfileId: profileId,
  })
  const scheduleWindow = getStylistScheduleWindow()

  const sections = useMemo(
    () => buildStylistScheduleSections(reservations, locale, t('stylistPortal.schedule.today')),
    [reservations, locale, t],
  )

  if (profileLoading || (isLoading && !profileId)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-content-muted">{t('common.loading')}</div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-content font-semibold">{t('stylistPortal.schedule.noProfile')}</p>
        <p className="mt-1 text-sm text-content-strong">{t('stylistPortal.schedule.profileNotFound')}</p>
      </Card>
    )
  }

  const empty = !isLoading && !error && reservations.length === 0

  return (
    <div className="space-y-4">
      <div data-stylist-schedule-heading className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-content">{t('stylistPortal.schedule.title')}</h1>
          <p className="text-sm text-content-strong">
            {t('stylistPortal.schedule.range', { from: formatDate(scheduleWindow.fromDate, locale), to: formatDate(scheduleWindow.toDate, locale) })}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-busy={isFetching}
        >
          {t('stylistPortal.schedule.refresh')}
        </Button>
        <Button asChild>
          <Link to="/stylist/schedule/new">{t('stylistPortal.schedule.directBooking')}</Link>
        </Button>
      </div>

      {isFetching ? (
        <p role="status" aria-live="polite" className="text-sm text-content-muted">
          {t('common.loading')}
        </p>
      ) : null}

      {error ? (
        <Card className="flex flex-wrap items-center justify-between gap-2 p-4" role="alert">
          <p className="text-sm text-content-strong">{t('stylistPortal.schedule.loadFailed')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {t('common.retry')}
          </Button>
        </Card>
      ) : null}

      {empty ? (
        <Card className="p-6">
          <p className="font-semibold text-content">{t('stylistPortal.schedule.emptyTitle')}</p>
          <p className="mt-1 text-sm text-content-strong">{t('stylistPortal.schedule.emptyDescription')}</p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-sm font-semibold text-content-strong">{section.title}</h2>
            <div className="grid gap-3">
              {section.data.map((reservation) => (
                <StylistScheduleReservationCard key={reservation.id} reservation={reservation} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
