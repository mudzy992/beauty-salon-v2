import { Check, Loader2, Search } from 'lucide-react'
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
}: Props) => (
  <div className="space-y-4">
    <div>
      <Label>Stilista</Label>
      <select
        required
        value={form.stylistProfileId}
        onChange={(e) => setForm({ ...form, stylistProfileId: e.target.value })}
        className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <option value="">Odaberite stilistu</option>
        {stylists.map((s) => (
          <option key={s.id} value={s.id}>
            {getStylistName(s)}
          </option>
        ))}
      </select>
    </div>
    <div>
      <Label>Klijent</Label>
      <div ref={clientDropdownRef} className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          value={clientSearch}
          onChange={(e) => {
            setClientSearch(e.target.value)
            setShowClientDropdown(true)
            setForm((prev) => ({ ...prev, clientId: '' }))
          }}
          onFocus={() => setShowClientDropdown(true)}
          placeholder="Pretražite klijenta..."
        />
        {showClientDropdown && filteredClients.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
            {filteredClients.map((c) => (
              <li
                key={c.id}
                className="cursor-pointer px-3 py-2 text-sm hover:bg-brand-champagne/20"
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
      <Label>Servisi</Label>
      <div ref={serviceDropdownRef} className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          value={serviceSearch}
          onChange={(e) => {
            setServiceSearch(e.target.value)
            setShowServiceDropdown(true)
          }}
          onFocus={() => setShowServiceDropdown(true)}
          placeholder="Pretražite servis..."
        />
        {showServiceDropdown && filteredServices.length > 0 ? (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
            {filteredServices.map((svc) => (
              <li
                key={svc.id}
                className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => onToggleService(svc)}
              >
                <div className="flex justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    {form.serviceIds.includes(svc.id) ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : null}
                    {svc.name}
                  </span>
                  <span className="text-slate-500">{Number(svc.price).toFixed(2)} KM</span>
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
      <Label>Datum</Label>
      <Input
        type="date"
        className="mt-1"
        value={form.date}
        onChange={(e) => setForm({ ...form, date: e.target.value })}
      />
    </div>
    {editId ? (
      <div>
        <Label>Status</Label>
        <select
          value={form.status}
          onChange={(e) =>
            setForm({ ...form, status: e.target.value as 'PENDING' | 'COMPLETED' })
          }
          className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <option value="PENDING">Na čekanju</option>
          <option value="COMPLETED">Kompletiran</option>
        </select>
        {form.status === 'PENDING' ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            Povratak na „Na čekanju“ za kompletiran unos može poništiti KIF efekte i vratiti
            povezanu rezervaciju u „U toku“.
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
      <p className="text-xs text-slate-500">
        Loyalty popust: {loyaltyPercent}% ({loyaltyDiscountAmount.toFixed(2)} KM)
      </p>
    ) : null}
    <div>
      <Label>Bilješke</Label>
      <Textarea
        className="mt-1"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        rows={2}
      />
    </div>
    <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
      <Label className="mb-2 block">Loyalty</Label>
      {loadingLoyalty ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      ) : loyaltyInfo?.enabled &&
        loyaltyInfo?.hasAccount &&
        loyaltyInfo?.redeemEnabled &&
        loyaltyInfo?.service ? (
        <div className="space-y-2">
          <p className="text-sm">
            Bodovi: {loyaltyInfo.points ?? 0} · Max popust:{' '}
            {loyaltyInfo.service.maxDiscountPercent}%
          </p>
          <Input
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
        <p className="text-sm text-slate-600">Loyalty nije dostupan.</p>
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
            Čuvam...
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  </div>
)
