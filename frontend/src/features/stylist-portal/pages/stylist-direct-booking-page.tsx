import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { useStylistDirectBooking } from '../hooks/useStylistDirectBooking'
import { DirectBookingClientField } from '../components/direct-booking-client-field'
import { DirectBookingServicesFieldset } from '../components/direct-booking-services-fieldset'
import { DirectBookingScheduleFields } from '../components/direct-booking-schedule-fields'

/**
 * Direktno zakazivanje (S10) — **tanka kompozicija**.
 *
 * Stanje i tok su u `hooks/useStylistDirectBooking.ts`, a prikaz je podijeljen
 * u tri komponente (`components/direct-booking-*.tsx`).
 *
 * Sve poruke, zaštite od zastarjelih odgovora i notifikacije su **identične**
 * ranijem monolitnom fajlu — razlika je samo u tome gdje se nalaze.
 */
export const StylistDirectBookingPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const navigate = useNavigate()
  const booking = useStylistDirectBooking()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-content">{t('stylistPortal.directBooking.title')}</h1>
          <p className="text-sm text-content-strong">
            {t('stylistPortal.directBooking.description')}
          </p>
        </div>
        <Button asChild type="button" variant="outline">
          <Link to="/stylist/schedule">{t('common.back')}</Link>
        </Button>
      </div>

      <Card className="space-y-4 p-4">
        <DirectBookingClientField
          clientSearch={booking.clientSearch}
          onClientSearchChange={booking.handleClientSearchChange}
          loadingClients={booking.loadingClients}
          clientSearchError={booking.clientSearchError}
          clients={booking.clients}
          selectedClient={booking.selectedClient}
          clientLabel={booking.clientLabel}
          onSelectClient={booking.handleSelectClient}
          onRetrySearch={() => void booking.searchClients(booking.clientSearch.trim())}
        />

        <DirectBookingServicesFieldset
          servicesLoadError={booking.servicesLoadError}
          onRetryServices={() => void booking.loadServices()}
          selectedClient={booking.selectedClient}
          loadingServices={booking.loadingServices}
          filteredServices={booking.filteredServices}
          serviceIds={booking.serviceIds}
          onToggleService={booking.toggleServiceId}
          locale={locale}
        />

        <DirectBookingScheduleFields
          reservationDate={booking.reservationDate}
          onReservationDateChange={booking.setReservationDate}
          startTime={booking.startTime}
          onStartTimeChange={booking.setStartTime}
          endTime={booking.endTime}
          onEndTimeChange={booking.setEndTime}
          clientNotes={booking.clientNotes}
          onClientNotesChange={booking.setClientNotes}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/stylist/schedule')}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={
              booking.saving ||
              !booking.selectedClient?.gender ||
              booking.serviceIds.length === 0 ||
              !booking.reservationDate ||
              !booking.startTime ||
              !booking.endTime
            }
            onClick={() => void booking.handleSubmit()}
          >
            {booking.saving ? t('stylistPortal.directBooking.creating') : t('stylistPortal.directBooking.create')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
