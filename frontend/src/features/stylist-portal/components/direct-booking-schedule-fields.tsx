import { useTranslation } from 'react-i18next'

import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'

/**
 * Datum, termini i napomena (S10).
 *
 * Izdvojeno iz `pages/stylist-direct-booking-page.tsx` **bez promjene**: isti
 * `id`-ovi kontrola, iste `<Label htmlFor>` veze i isti `Textarea` za napomenu.
 */
export const DirectBookingScheduleFields = ({
  reservationDate,
  onReservationDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  clientNotes,
  onClientNotesChange,
}: {
  reservationDate: string
  onReservationDateChange: (value: string) => void
  startTime: string
  onStartTimeChange: (value: string) => void
  endTime: string
  onEndTimeChange: (value: string) => void
  clientNotes: string
  onClientNotesChange: (value: string) => void
}) => {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="stylist-direct-booking-date">{t('stylistPortal.directBooking.date')}</Label>
          <Input id="stylist-direct-booking-date" type="date" value={reservationDate} onChange={(e) => onReservationDateChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stylist-direct-booking-start">{t('stylistPortal.directBooking.startTime')}</Label>
          <Input id="stylist-direct-booking-start" type="time" value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stylist-direct-booking-end">{t('stylistPortal.directBooking.endTime')}</Label>
          <Input id="stylist-direct-booking-end" type="time" value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="stylist-direct-booking-note">{t('stylistPortal.directBooking.note')}</Label>
        <Textarea id="stylist-direct-booking-note" rows={4} value={clientNotes} onChange={(e) => onClientNotesChange(e.target.value)} />
      </div>
    </>
  )
}
