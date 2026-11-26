import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import type { ClientOption } from '../types'
import type { CatalogService } from '../hooks/useWorkbookNewEntryForm'
import { formatKm } from '../workbook-amount'

/**
 * Kartica odabira usluga za novi unos u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene ponašanja**:
 *  - ista filtriranja po spolu klijenta (`gender`) i po tekstu pretrage;
 *  - `aria-pressed` na prijedlogu usluge (WCAG 4.1.2 — stanje odabira);
 *  - isti `aria-label` na dugmetu za uklanjanje usluge (label-in-name);
 *  - `role="alert"` na poruci „spol klijenta je obavezan" (WCAG 3.3.1 / 4.1.3).
 */
export const NewEntryServiceCard = ({
  serviceSearchId,
  serviceSearch,
  onServiceSearchChange,
  onServiceSearchFocus,
  showServiceDropdown,
  filteredServices,
  serviceDropdownRef,
  selectedClient,
  selectedServices,
  serviceIds,
  onToggleService,
  locale,
}: {
  serviceSearchId: string
  serviceSearch: string
  onServiceSearchChange: (value: string) => void
  onServiceSearchFocus: () => void
  showServiceDropdown: boolean
  filteredServices: CatalogService[]
  serviceDropdownRef: React.RefObject<HTMLDivElement>
  selectedClient: ClientOption | null
  selectedServices: CatalogService[]
  serviceIds: string[]
  onToggleService: (service: CatalogService) => void
  locale: string
}) => {
  const { t } = useTranslation()

  return (
    <Card className="p-4">
      <Label htmlFor={serviceSearchId}>{t('stylistWorkbook.newEntry.service')}</Label>
      {!selectedClient ? (
        <p className="mt-1 text-xs text-content-muted">
          {t('stylistWorkbook.newEntry.selectClientForServices')}
        </p>
      ) : !selectedClient.gender ? (
        <p role="alert" className="mt-1 text-xs text-bad-foreground">
          {t('stylistWorkbook.newEntry.clientGenderRequired')}
        </p>
      ) : null}
      <div ref={serviceDropdownRef} className="relative mt-2">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
          aria-hidden="true"
        />
        <Input
          id={serviceSearchId}
          value={serviceSearch}
          disabled={!selectedClient || !selectedClient.gender}
          placeholder={
            !selectedClient
              ? t('stylistWorkbook.newEntry.selectClient')
              : t('stylistWorkbook.newEntry.searchService')
          }
          className="pl-9"
          onFocus={onServiceSearchFocus}
          onChange={(e) => onServiceSearchChange(e.target.value)}
        />
        {showServiceDropdown && filteredServices.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
            {filteredServices.map((svc) => (
              <li key={svc.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-brand-champagne/20"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => onToggleService(svc)}
                  aria-pressed={serviceIds.includes(svc.id)}
                >
                  <span className="flex justify-between gap-2 text-sm">
                    <span>{svc.name}</span>
                    <span className="text-content-muted">{formatKm(Number(svc.price), locale)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {selectedServices.length > 0 ? (
        <div className="mt-3 space-y-2">
          {selectedServices.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-semibold text-content">{s.name}</div>
                <div className="text-xs text-content-muted">{formatKm(Number(s.price), locale)}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onToggleService(s)}
                aria-label={`${t('common.delete')}: ${s.name}`}
              >
                {t('common.delete')}
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
