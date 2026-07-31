import { Check, Loader2, Search } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type {
  ClientOption,
  DailyLogFormState,
  LoyaltyInfo,
  ServiceOption,
  StylistOption,
} from './types'
import { getStylistName } from './types'
import { TipPreview } from './tip-preview'

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
  basePrice: number
  loyaltyPercent: number
  loyaltyDiscountAmount: number
  chargeAmount: number
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
  basePrice,
  loyaltyPercent,
  loyaltyDiscountAmount,
  chargeAmount,
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
                className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => onSelectClient(c)}
              >
                <p className="text-sm">
                  {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.username}
                </p>
                <p className="text-xs text-slate-500">{c.username}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
    <div>
      <Label>Servis</Label>
      <div ref={serviceDropdownRef} className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          value={serviceSearch}
          disabled={!form.clientId && !editId}
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
        <div className="mt-2 space-y-2">
          {selectedServices.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
            >
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs text-slate-500">{Number(s.price).toFixed(2)} KM</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onToggleService(s)}>
                Ukloni
              </Button>
            </div>
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
      </div>
    ) : null}
    <div>
      <Label>Naplaćeno (KM)</Label>
      <Input
        className="mt-1"
        value={paidAmount}
        onChange={(e) => setPaidAmount(e.target.value)}
        placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
      />
      <p className="mt-2 text-xs text-slate-600">
        Servis: {basePrice.toFixed(2)} KM
        {loyaltyPercent > 0
          ? ` · Loyalty: ${loyaltyPercent}% (${loyaltyDiscountAmount.toFixed(2)} KM)`
          : ''}
      </p>
      <p className="mt-1 text-sm font-bold">Za naplatu: {chargeAmount.toFixed(2)} KM</p>
      <TipPreview paidAmount={paidAmount} chargeAmount={chargeAmount} />
    </div>
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
