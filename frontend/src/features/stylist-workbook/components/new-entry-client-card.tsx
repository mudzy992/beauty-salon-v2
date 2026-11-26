import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import type { ClientOption } from '../types'

/**
 * Kartica odabira klijenta za novi unos u radnoj knjizi (S10).
 *
 * Izdvojeno iz `pages/workbook-new-entry-page.tsx` **bez promjene ponašanja**:
 * isti `useId`-izvedeni `id`, isti `onMouseDown` preventDefault (dropdown ostaje
 * otvoren dok se klik ne završi), ista lista prijedloga (max 50), isti reset
 * odabira pri promjeni pretrage.
 *
 * Lista prijedloga je `<ul>` + `<li>` + `<button type="button">` — tastaturno
 * operabilna i bez miša (WCAG 2.1.1).
 */
export const NewEntryClientCard = ({
  clientSearchId,
  clientSearch,
  onClientSearchChange,
  onClientSearchFocus,
  showClientDropdown,
  filteredClients,
  clientDropdownRef,
  selectedClient,
  onSelectClient,
}: {
  clientSearchId: string
  clientSearch: string
  onClientSearchChange: (value: string) => void
  /** Samo otvara listu prijedloga — NE smije poništiti odabir (izvorna semantika `onFocus`). */
  onClientSearchFocus: () => void
  showClientDropdown: boolean
  filteredClients: ClientOption[]
  clientDropdownRef: React.RefObject<HTMLDivElement>
  selectedClient: ClientOption | null
  onSelectClient: (client: ClientOption) => void
}) => {
  const { t } = useTranslation()

  return (
    <Card className="p-4">
      <Label htmlFor={clientSearchId}>{t('stylistWorkbook.newEntry.client')}</Label>
      <div ref={clientDropdownRef} className="relative mt-2">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
          aria-hidden="true"
        />
        <Input
          id={clientSearchId}
          value={clientSearch}
          placeholder={t('stylistWorkbook.newEntry.searchClient')}
          className="pl-9"
          onFocus={onClientSearchFocus}
          onChange={(e) => onClientSearchChange(e.target.value)}
        />
        {showClientDropdown && filteredClients.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
            {filteredClients.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-brand-champagne/20"
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => onSelectClient(c)}
                >
                  <p className="text-sm">{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}</p>
                  <p className="text-xs text-content-muted">{c.username}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {selectedClient ? (
        <p className="mt-2 text-xs text-ok-foreground">
          {t('stylistWorkbook.newEntry.selectedClient', {
            client:
              [selectedClient.firstName, selectedClient.lastName].filter(Boolean).join(' ') ||
              selectedClient.username,
          })}
        </p>
      ) : null}
    </Card>
  )
}
