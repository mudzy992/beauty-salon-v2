import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import type { DirectBookingClient } from '../hooks/useStylistDirectBooking'

/**
 * Polje za odabir klijenta (S10).
 *
 * Izdvojeno iz `pages/stylist-direct-booking-page.tsx` **bez promjene**: isti
 * `id` kontrole, isti status učitavanja (`role="status"`), isti alert sa
 * „pokušaj ponovo", isto prazno stanje i isti `aria-pressed` na prijedlogu.
 */
export const DirectBookingClientField = ({
  clientSearch,
  onClientSearchChange,
  loadingClients,
  clientSearchError,
  clients,
  selectedClient,
  clientLabel,
  onSelectClient,
  onRetrySearch,
}: {
  clientSearch: string
  onClientSearchChange: (value: string) => void
  loadingClients: boolean
  clientSearchError: boolean
  clients: DirectBookingClient[]
  selectedClient: DirectBookingClient | null
  clientLabel: (client: DirectBookingClient) => string
  onSelectClient: (client: DirectBookingClient) => void
  onRetrySearch: () => void
}) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label htmlFor="stylist-direct-booking-client">
        {t('stylistPortal.directBooking.client')}
      </Label>
      <Input
        id="stylist-direct-booking-client"
        value={clientSearch}
        onChange={(e) => onClientSearchChange(e.target.value)}
        placeholder={t('stylistPortal.directBooking.searchClient')}
      />
      {loadingClients ? (
        <p role="status" aria-live="polite" className="text-sm text-content-muted">
          {t('common.loading')}
        </p>
      ) : null}
      {clientSearchError ? (
        <div role="alert" className="flex items-center justify-between gap-3 text-sm text-bad-foreground">
          <span>{t('stylistPortal.directBooking.clientSearchFailed')}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRetrySearch}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
      {!loadingClients && !clientSearchError && clientSearch.trim() && clients.length === 0 ? (
        <p className="text-sm text-content-muted">{t('stylistPortal.directBooking.noClients')}</p>
      ) : null}
      {clients.length > 0 ? (
        <div className="grid gap-2">
          {clients.map((client) => {
            const label = clientLabel(client)
            const selected = selectedClient?.id === client.id
            return (
              <button
                key={client.id}
                type="button"
                aria-pressed={selected}
                className={
                  selected
                    ? 'rounded-lg border border-brand-gold-ring bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                    : 'rounded-lg border border-line px-3 py-2 text-left text-sm'
                }
                onClick={() => onSelectClient(client)}
              >
                <div className="font-medium text-content">{label}</div>
                <div className="text-xs text-content-muted">
                  {client.gender === 'MALE'
                    ? t('stylistPortal.directBooking.male')
                    : client.gender === 'FEMALE'
                      ? t('stylistPortal.directBooking.female')
                      : t('stylistPortal.directBooking.genderNotDefined')}
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
