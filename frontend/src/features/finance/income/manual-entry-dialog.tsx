import { Check, Loader2, X } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { useManualEntryForm } from './use-manual-entry-form'
import { formatMoney, getPersonName } from '../finance.utils'
import type { IncomeBookManualEntry, ManualEntryPayload } from '../finance.types'

type ManualEntryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  year: number
  month: number
  editing: IncomeBookManualEntry | null
  isSaving: boolean
  onSubmit: (payload: ManualEntryPayload) => void
}

const selectClass =
  'h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950'

export function ManualEntryDialog({
  open,
  onOpenChange,
  year,
  month,
  editing,
  isSaving,
  onSubmit,
}: ManualEntryDialogProps) {
  const f = useManualEntryForm({ open, year, month, editing })

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Uredi ručni prihod' : 'Novi ručni prihod'}
      description="Iznos iznad cijene servisa se knjiži kao napojnica, a manjak se može evidentirati kao dug."
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Odustani
          </Button>
          <Button
            onClick={() => onSubmit(f.toPayload())}
            disabled={isSaving || Boolean(f.validationError)}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            Sačuvaj
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="manual-date">Datum</Label>
            <Input
              id="manual-date"
              type="date"
              value={f.form.date}
              onChange={(event) => f.update({ date: event.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="manual-stylist">Stilista</Label>
            <select
              id="manual-stylist"
              className={selectClass}
              value={f.form.stylistProfileId}
              onChange={(event) =>
                f.update({ stylistProfileId: event.target.value, serviceId: '' })
              }
            >
              <option value="">— Odaberi stilistu —</option>
              {f.stylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {getPersonName(stylist.user)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="manual-service">Servis</Label>
          <select
            id="manual-service"
            className={selectClass}
            value={f.form.serviceId}
            onChange={(event) => f.update({ serviceId: event.target.value })}
            disabled={!f.form.stylistProfileId || f.isLoadingServices}
          >
            <option value="">
              {f.form.stylistProfileId ? '— Odaberi servis —' : 'Prvo odaberite stilistu'}
            </option>
            {f.services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {formatMoney(service.price ?? 0)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="manual-client">Klijent</Label>
          {f.selectedClient ? (
            <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <span className="text-sm">{getPersonName(f.selectedClient)}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ukloni klijenta"
                onClick={() => f.selectClient(null)}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <>
              <Input
                id="manual-client"
                value={f.clientQuery}
                onChange={(event) => f.setClientQuery(event.target.value)}
                placeholder="Pretraži klijenta (najmanje 2 znaka)…"
              />
              {f.clientResults.length > 0 ? (
                <ul className="max-h-40 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
                  {f.clientResults.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900"
                        onClick={() => f.selectClient(client)}
                      >
                        {getPersonName(client)}
                        <Check className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="manual-paid">Naplaćeno</Label>
          <Input
            id="manual-paid"
            type="number"
            min={0}
            step="0.01"
            value={f.form.paidAmount}
            onChange={(event) => f.update({ paidAmount: event.target.value })}
          />
          <div className="mt-1 grid gap-1 rounded-md bg-slate-50 p-2 text-xs dark:bg-slate-900">
            <div className="flex justify-between">
              <span className="text-slate-500">Cijena servisa</span>
              <span className="tabular-nums">{formatMoney(f.servicePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Napojnica</span>
              <span className="tabular-nums">{formatMoney(f.tipAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Nenaplaćeno</span>
              <span
                className={`tabular-nums ${f.debtAmount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}
              >
                {formatMoney(f.debtAmount)}
              </span>
            </div>
          </div>
        </div>

        {f.debtAmount > 0 ? (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Nenaplaćeni iznos</legend>
            <div className="flex gap-2">
              <Button
                variant={f.form.debtHandling === 'IGNORE_DEBT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => f.update({ debtHandling: 'IGNORE_DEBT' })}
                aria-pressed={f.form.debtHandling === 'IGNORE_DEBT'}
              >
                Zanemari
              </Button>
              <Button
                variant={f.form.debtHandling === 'CREATE_DEBT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => f.update({ debtHandling: 'CREATE_DEBT' })}
                disabled={!f.canCreateDebt}
                aria-pressed={f.form.debtHandling === 'CREATE_DEBT'}
              >
                Evidentiraj dug
              </Button>
            </div>
            {!f.canCreateDebt ? (
              <p className="text-xs text-slate-500">
                Za dug su obavezni i klijent i stilista.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <div className="grid gap-1">
          <Label htmlFor="manual-notes">Napomena</Label>
          <Textarea
            id="manual-notes"
            rows={2}
            value={f.form.notes}
            onChange={(event) => f.update({ notes: event.target.value })}
          />
        </div>

        {f.validationError ? (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {f.validationError}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
