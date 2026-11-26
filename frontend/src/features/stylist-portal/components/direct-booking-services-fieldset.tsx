import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'
import type { DirectBookingService } from '../hooks/useStylistDirectBooking'

/**
 * Odabir usluga (S10).
 *
 * Izdvojeno iz `pages/stylist-direct-booking-page.tsx` **bez promjene**: isti
 * `fieldset`/`legend`, isti alert sa „pokušaj ponovo", iste poruke za slučaj
 * kad klijent nije odabran / nema spol / nema usluga, i isti `aria-pressed`
 * na svakoj usluzi.
 */
export const DirectBookingServicesFieldset = ({
  servicesLoadError,
  onRetryServices,
  selectedClient,
  loadingServices,
  filteredServices,
  serviceIds,
  onToggleService,
  locale,
}: {
  servicesLoadError: boolean
  onRetryServices: () => void
  selectedClient: { gender?: 'MALE' | 'FEMALE' } | null
  loadingServices: boolean
  filteredServices: DirectBookingService[]
  serviceIds: string[]
  onToggleService: (serviceId: string) => void
  locale: string
}) => {
  const { t } = useTranslation()

  return (
    <fieldset className="space-y-2 border-0 p-0">
      <legend className="text-sm font-medium text-content-strong">
        {t('stylistPortal.directBooking.services')}
      </legend>
      {servicesLoadError ? (
        <div role="alert" className="flex items-center justify-between gap-3 text-sm text-bad-foreground">
          <span>{t('stylistPortal.directBooking.serviceLoadFailed')}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetryServices}>
            {t('common.retry')}
          </Button>
        </div>
      ) : !selectedClient ? (
        <p className="text-sm text-content-muted">{t('stylistPortal.directBooking.chooseClientForServices')}</p>
      ) : !selectedClient.gender ? (
        <p className="text-sm text-warn-foreground">{t('stylistPortal.directBooking.genderMissing')}</p>
      ) : loadingServices ? (
        <p role="status" aria-live="polite" className="text-sm text-content-muted">
          {t('common.loading')}
        </p>
      ) : filteredServices.length === 0 ? (
        <p className="text-sm text-content-muted">{t('stylistPortal.directBooking.noServices')}</p>
      ) : (
        <div className="grid gap-2">
          {filteredServices.map((service) => (
            <button
              key={service.id}
              type="button"
              aria-pressed={serviceIds.includes(service.id)}
              className={
                serviceIds.includes(service.id)
                  ? 'rounded-lg border border-brand-gold-ring bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                  : 'rounded-lg border border-line px-3 py-2 text-left text-sm'
              }
              onClick={() => onToggleService(service.id)}
            >
              <div className="font-medium text-content">{service.name}</div>
              <div className="text-xs text-content-muted">{formatLocalizedAmount(Number(service.price ?? 0), locale)}</div>
            </button>
          ))}
        </div>
      )}
    </fieldset>
  )
}
