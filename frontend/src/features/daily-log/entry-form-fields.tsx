import { useState } from 'react'
import { Check, Loader2, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type {
  ClientDebtOption,
  ClientOption,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
  StylistOption,
} from './types'
import { getStylistName } from './types'
import { DailyLogPricingPanel } from './pricing-panel'

type Props = {
  editId: string | null
  form: DailyLogFormState
  setForm: React.Dispatch<React.SetStateAction<DailyLogFormState>>
  stylists: StylistOption[]
  selectedServices: ServiceOption[]
  filteredServices: ServiceOption[]
  filteredClients: ClientOption[]
  serviceSearch: string
  setServiceSearch: (v: string) => void
  clientSearch: string
  setClientSearch: (v: string) => void
  showServiceDropdown: boolean
  setShowServiceDropdown: (v: boolean) => void
  showClientDropdown: boolean
  setShowClientDropdown: (v: boolean) => void
  serviceDropdownRef: React.RefObject<HTMLDivElement>
  clientDropdownRef: React.RefObject<HTMLDivElement>
  paidAmount: string
  setPaidAmount: (v: string) => void
  chargeAmount: number
  debtsSum: number
  tipPreview: number
  shortfall: number
  createDebt: boolean
  setCreateDebt: (v: boolean) => void
  openDebts: ClientDebtOption[]
  settleDebtsEnabled: boolean
  setSettleDebtsEnabled: (v: boolean) => void
  settledDebtIds: string[]
  onToggleSettledDebt: (id: string) => void
  setUnitPrice: (serviceId: string, value: number) => void
  loyaltyPercent: number
  loyaltyDiscountAmount: number
  loyaltyInfo: LoyaltyInfo | null
  loadingLoyalty: boolean
  onToggleService: (svc: ServiceOption) => void
  onSelectClient: (client: ClientOption) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
  cancelLabel: string
  saveLabel: string
}

export const DailyLogEntryFormFields = ({
  editId,
  form,
  setForm,
  stylists,
  selectedServices,
  filteredServices,
  filteredClients,
  serviceSearch,
  setServiceSearch,
  clientSearch,
  setClientSearch,
  showServiceDropdown,
  setShowServiceDropdown,
  showClientDropdown,
  setShowClientDropdown,
  serviceDropdownRef,
  clientDropdownRef,
  paidAmount,
  setPaidAmount,
  chargeAmount,
  debtsSum,
  tipPreview,
  shortfall,
  createDebt,
  setCreateDebt,
  openDebts,
  settleDebtsEnabled,
  setSettleDebtsEnabled,
  settledDebtIds,
  onToggleSettledDebt,
  setUnitPrice,
  loyaltyPercent,
  loyaltyDiscountAmount,
  loyaltyInfo,
  loadingLoyalty,
  onToggleService,
  onSelectClient,
  saving,
  onSave,
  onCancel,
  cancelLabel,
  saveLabel,
}: Props) => {
  const { t, i18n } = useTranslation()
  // Tastaturska navigacija kroz listbox (2.1.1): samo UI stanje, ne dira poslovno stanje.
  const [clientActiveIdx, setClientActiveIdx] = useState(-1)
  const [serviceActiveIdx, setServiceActiveIdx] = useState(-1)
  const stepIndex = (current: number, count: number, key: string): number | null => {
    if (count === 0) return null
    if (key === 'ArrowDown') return (current + 1) % count
    if (key === 'ArrowUp') return (current - 1 + count) % count
    if (key === 'Home') return 0
    if (key === 'End') return count - 1
    return null
  }

  return <div className="space-y-4">
    <div>
      <Label htmlFor="dailylog-stylist">{t('dailyLog.form.stylist')}</Label>
      <select
        id="dailylog-stylist"
        required
        value={form.stylistProfileId}
        onChange={(e) => setForm({ ...form, stylistProfileId: e.target.value })}
        className="mt-1 flex h-10 w-full rounded-md border border-input-border bg-surface px-3 text-sm text-content"
      >
        <option value="">{t('dailyLog.form.chooseStylist')}</option>
        {stylists.map((s) => (
          <option key={s.id} value={s.id}>
            {getStylistName(s)}
          </option>
        ))}
      </select>
    </div>
    <div>
      <Label htmlFor="dailylog-client">{t('dailyLog.form.client')}</Label>
      <div ref={clientDropdownRef} className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
        <Input
          id="dailylog-client"
          className="pl-9"
          role="combobox"
          aria-expanded={showClientDropdown && filteredClients.length > 0}
          aria-controls="dailylog-client-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          aria-activedescendant={
            showClientDropdown && filteredClients.length > 0 && clientActiveIdx >= 0
              ? `dailylog-client-opt-${filteredClients[clientActiveIdx].id}`
              : undefined
          }
          value={clientSearch}
          onChange={(e) => {
            setClientSearch(e.target.value)
            setShowClientDropdown(true)
            setClientActiveIdx(-1)
            setForm((prev) => ({ ...prev, clientId: '' }))
          }}
          onFocus={() => setShowClientDropdown(true)}
          onKeyDown={(e) => {
            const open = showClientDropdown && filteredClients.length > 0
            const next = stepIndex(clientActiveIdx, open ? filteredClients.length : 0, e.key)
            if (next !== null) {
              e.preventDefault()
              if (!open) setShowClientDropdown(true)
              setClientActiveIdx(next)
              return
            }
            if (e.key === 'Enter' && open && clientActiveIdx >= 0) {
              e.preventDefault()
              onSelectClient(filteredClients[clientActiveIdx])
              setShowClientDropdown(false)
              setClientActiveIdx(-1)
              return
            }
            if (e.key === 'Escape' && open) {
              e.preventDefault()
              setShowClientDropdown(false)
              setClientActiveIdx(-1)
            }
          }}
          placeholder={t('dailyLog.form.searchClient')}
        />
        {showClientDropdown && filteredClients.length > 0 ? (
          <ul
            id="dailylog-client-listbox"
            role="listbox"
            aria-label={t('dailyLog.form.client')}
            className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-lg"
          >
            {filteredClients.map((c, idx) => (
              // ARIA combobox: tastatura je kompletno na inputu iznad (role="combobox",
              // aria-activedescendant, onKeyDown), a stavka liste nije samostalno fokusabilna,
              // pa click-events-have-key-events ovdje nije prekršaj 2.1.1.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={c.id}
                id={`dailylog-client-opt-${c.id}`}
                role="option"
                aria-selected={idx === clientActiveIdx}
                className={
                  idx === clientActiveIdx
                    ? 'cursor-pointer bg-brand-champagne/20 px-3 py-2 text-sm'
                    : 'cursor-pointer px-3 py-2 text-sm hover:bg-brand-champagne/20'
                }
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => onSelectClient(c)}
              >
                {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
    <div>
      <Label htmlFor="dailylog-services">{t('dailyLog.form.services')}</Label>
      <div ref={serviceDropdownRef} className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
        <Input
          id="dailylog-services"
          className="pl-9"
          role="combobox"
          aria-expanded={showServiceDropdown && filteredServices.length > 0}
          aria-controls="dailylog-service-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          aria-activedescendant={
            showServiceDropdown && filteredServices.length > 0 && serviceActiveIdx >= 0
              ? `dailylog-service-opt-${filteredServices[serviceActiveIdx].id}`
              : undefined
          }
          value={serviceSearch}
          onChange={(e) => {
            setServiceSearch(e.target.value)
            setShowServiceDropdown(true)
            setServiceActiveIdx(-1)
          }}
          onFocus={() => setShowServiceDropdown(true)}
          onKeyDown={(e) => {
            const open = showServiceDropdown && filteredServices.length > 0
            const next = stepIndex(serviceActiveIdx, open ? filteredServices.length : 0, e.key)
            if (next !== null) {
              e.preventDefault()
              if (!open) setShowServiceDropdown(true)
              setServiceActiveIdx(next)
              return
            }
            if (e.key === 'Enter' && open && serviceActiveIdx >= 0) {
              e.preventDefault()
              onToggleService(filteredServices[serviceActiveIdx])
              return
            }
            if (e.key === 'Escape' && open) {
              e.preventDefault()
              setShowServiceDropdown(false)
              setServiceActiveIdx(-1)
            }
          }}
          placeholder={t('dailyLog.form.searchService')}
        />
        {showServiceDropdown && filteredServices.length > 0 ? (
          <ul
            id="dailylog-service-listbox"
            role="listbox"
            aria-multiselectable="true"
            aria-label={t('dailyLog.form.services')}
            className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-line bg-surface shadow-lg"
          >
            {filteredServices.map((svc, idx) => (
              // ARIA combobox: tastatura je kompletno na inputu iznad (role="combobox",
              // aria-activedescendant, onKeyDown), a stavka liste nije samostalno fokusabilna,
              // pa click-events-have-key-events ovdje nije prekršaj 2.1.1.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={svc.id}
                id={`dailylog-service-opt-${svc.id}`}
                role="option"
                aria-selected={form.serviceIds.includes(svc.id)}
                className={
                  idx === serviceActiveIdx
                    ? 'cursor-pointer bg-brand-champagne/20 px-3 py-2'
                    : 'cursor-pointer px-3 py-2 hover:bg-brand-champagne/20'
                }
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => onToggleService(svc)}
              >
                <div className="flex justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    {form.serviceIds.includes(svc.id) ? (
                      <Check className="h-4 w-4 text-ok-foreground" />
                    ) : null}
                    {svc.name}
                  </span>
                  <span className="text-content-muted">{formatLocalizedAmount(svc.price, i18n.language)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {selectedServices.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedServices.map((s) => (
            <Button key={s.id} type="button" variant="outline" size="sm" onClick={() => onToggleService(s)}>
              {s.name} ×
            </Button>
          ))}
        </div>
      ) : null}
    </div>
    <div>
      <Label htmlFor="dailylog-date">{t('dailyLog.form.date')}</Label>
      <Input
        id="dailylog-date"
        type="date"
        className="mt-1"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
    </div>
    {editId ? (
      <div>
        <Label htmlFor="dailylog-status">{t('dailyLog.form.status')}</Label>
        <select
          id="dailylog-status"
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as 'PENDING' | 'COMPLETED' })
          }
          className="mt-1 flex h-10 w-full rounded-md border border-input-border bg-surface px-3 text-sm text-content"
        >
          <option value="PENDING">{t('dailyLog.form.pending')}</option>
          <option value="COMPLETED">{t('dailyLog.form.completed')}</option>
        </select>
        {form.status === 'PENDING' ? (
          <p className="mt-1 text-xs text-warn-foreground">
            {t('dailyLog.form.pendingWarning')}
          </p>
        ) : null}
      </div>
    ) : null}
    <DailyLogPricingPanel
      selectedServices={selectedServices}
      unitPrices={form.unitPrices}
      onUnitPriceChange={setUnitPrice}
      openDebts={editId ? [] : openDebts}
      settleDebtsEnabled={settleDebtsEnabled}
      onSettleDebtsEnabledChange={setSettleDebtsEnabled}
      settledDebtIds={settledDebtIds}
      onToggleSettledDebt={onToggleSettledDebt}
      chargeAmount={chargeAmount}
      debtsSum={debtsSum}
      paidAmount={paidAmount}
      onPaidAmountChange={setPaidAmount}
      tipPreview={tipPreview}
      shortfall={shortfall}
      createDebt={createDebt}
      onCreateDebtChange={setCreateDebt}
    />
    {loyaltyPercent > 0 ? (
      <p className="text-xs text-content-muted">
        {t('dailyLog.form.loyaltyDiscount', {
          percent: loyaltyPercent,
          amount: formatLocalizedAmount(loyaltyDiscountAmount, i18n.language),
        })}
      </p>
    ) : null}
    <div>
      <Label htmlFor="dailylog-notes">{t('dailyLog.form.notes')}</Label>
      <Textarea
        id="dailylog-notes"
        className="mt-1"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        rows={2}
      />
    </div>
    <div className="border-t border-line pt-3">
      <Label id="dailylog-loyalty-label" className="mb-2 block">{t('dailyLog.form.loyaltyProgram')}</Label>
      {loadingLoyalty ? (
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" />
      ) : loyaltyInfo?.enabled &&
        loyaltyInfo?.hasAccount &&
        loyaltyInfo?.redeemEnabled &&
        loyaltyInfo?.service ? (
        <div className="space-y-2">
          <p className="text-sm">
            {t('dailyLog.form.pointsAndMaxDiscount', {
              points: formatLocalizedNumber(loyaltyInfo.points ?? 0, i18n.language),
              percent: loyaltyInfo.service.maxDiscountPercent,
            })}
          </p>
          <Input
            id="dailylog-loyalty-percent"
            aria-labelledby="dailylog-loyalty-label"
            type="number"
            className="max-w-[140px]"
            min={0}
            max={loyaltyInfo.service.maxDiscountPercent}
            value={form.desiredLoyaltyPercent}
            onChange={(e) => {
              const v = Number(e.target.value) || 0
              const max = loyaltyInfo.service?.maxDiscountPercent ?? 0
              setForm((prev) => ({
                ...prev,
                desiredLoyaltyPercent: Math.max(0, Math.min(v, max)),
              }))
            }}
          />
        </div>
      ) : (
        <p className="text-sm text-content-muted">{t('dailyLog.form.loyaltyUnavailable')}</p>
      )}
    </div>
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="button" onClick={onSave} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('dailyLog.form.saving')}
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  </div>
}
