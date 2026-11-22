import { useId, useLayoutEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { Select } from '../../../components/ui/select'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { ResponsiveDialog } from '../components/responsive-dialog'
import { useManualEntryForm } from './use-manual-entry-form'
import { ManualEntryServicePicker } from './manual-entry-service-picker'
import { getPersonName } from '../finance.utils'
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

// 1.4.11: okvir <select> mora imati 3:1 prema podlozi; border-line
// (#E2E8F0) je 1.23:1. input-border -> --control-border = 4.24:1.
const selectClass =
  'h-9 w-full rounded-md border border-input-border bg-surface px-2 text-sm'

export function ManualEntryDialog({
  open,
  onOpenChange,
  year,
  month,
  editing,
  isSaving,
  onSubmit,
}: ManualEntryDialogProps) {
  const { t, i18n } = useTranslation()
  const f = useManualEntryForm({ open, year, month, editing })
  const stylistLoadingId = useId()
  const stylistErrorId = useId()
  const stylistRef = useRef<HTMLSelectElement>(null)
  const retryStylistRef = useRef<HTMLButtonElement>(null)
  const retryInFlight = useRef(false)
  const pendingStylistFocus = useRef(false)
  const [retryingStylists, setRetryingStylists] = useState(false)
  const stylistLoading = f.isLoadingStylists || retryingStylists
  const stylistError = f.hasStylistLoadError && !stylistLoading
  const clientSearchRef = useRef<HTMLInputElement>(null)
  const removeClientRef = useRef<HTMLButtonElement>(null)
  const pendingClientFocus = useRef<'search' | 'remove' | null>(null)
  useLayoutEffect(() => {
    const target = pendingClientFocus.current
    pendingClientFocus.current = null
    if (target === 'search') clientSearchRef.current?.focus()
    if (target === 'remove') removeClientRef.current?.focus()
  }, [f.selectedClient])
  useLayoutEffect(() => {
    if (retryingStylists || !pendingStylistFocus.current) return
    pendingStylistFocus.current = false
    if (open && (document.activeElement === document.body || document.activeElement === retryStylistRef.current)) {
      stylistRef.current?.focus()
    }
  }, [open, retryingStylists])
  const retryStylists = async () => {
    if (retryInFlight.current) return
    retryInFlight.current = true
    setRetryingStylists(true)
    try {
      const result = await f.retryStylists()
      if (result.isSuccess && document.activeElement === retryStylistRef.current) {
        pendingStylistFocus.current = true
      }
    } finally {
      retryInFlight.current = false
      setRetryingStylists(false)
    }
  }
  const formatAmount = (value: number | string) =>
    formatLocalizedAmount(value, i18n.language)

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(editing ? 'finance.manualEntry.edit' : 'finance.manualEntry.create')}
      description={t('finance.manualEntry.description')}
      footer={
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t('finance.manualEntry.cancel')}
          </Button>
          <Button
            onClick={() => onSubmit(f.toPayload())}
            disabled={isSaving || f.servicesUnavailable || Boolean(f.validationError)}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            {t('finance.manualEntry.save')}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="manual-date">{t('finance.manualEntry.date')}</Label>
            <Input
              id="manual-date"
              type="date"
              value={f.form.date}
              onChange={(event) => f.update({ date: event.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="manual-stylist">{t('finance.manualEntry.stylist')}</Label>
            <Select
              id="manual-stylist"
              ref={stylistRef}
              className={selectClass}
              disabled={stylistLoading || stylistError}
              aria-describedby={stylistLoading ? stylistLoadingId : stylistError ? stylistErrorId : undefined}
              value={f.form.stylistProfileId}
              onChange={(event) =>
                f.update({ stylistProfileId: event.target.value, serviceId: '' })
              }
            >
              <option value="">{t('finance.manualEntry.selectStylist')}</option>
              {f.stylists.map((stylist) => (
                <option key={stylist.id} value={stylist.id}>
                  {getPersonName(stylist.user)}
                </option>
              ))}
            </Select>
            {stylistLoading ? (
              <p id={stylistLoadingId} role="status" className="text-xs text-content-strong">
                {t('finance.manualEntry.loadingStylists')}
              </p>
            ) : null}
            {stylistError ? (
              <p id={stylistErrorId} role="alert" className="text-xs text-content">
                {t('finance.manualEntry.stylistsLoadError')}
              </p>
            ) : null}
            {stylistError || retryingStylists ? (
              <Button
                ref={retryStylistRef}
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                aria-disabled={retryingStylists || undefined}
                onClick={() => void retryStylists()}
              >
                {t('finance.manualEntry.retryStylists')}
              </Button>
            ) : null}
          </div>
        </div>

        <ManualEntryServicePicker
          key={f.form.stylistProfileId || 'no-stylist'}
          open={open}
          stylistId={f.form.stylistProfileId}
          value={f.form.serviceId}
          services={f.services}
          isLoading={f.isLoadingServices}
          hasError={f.hasServiceLoadError}
          retry={f.retryServices}
          onChange={(serviceId) => f.update({ serviceId })}
          formatAmount={formatAmount}
          selectClass={selectClass}
        />

        <div className="grid gap-1">
          {f.selectedClient ? (
            <>
              <span
                id="manual-client-selected-label"
                className="text-sm font-medium text-content-strong"
              >
                {t('finance.manualEntry.client')}
              </span>
              <div
                role="group"
                aria-labelledby="manual-client-selected-label"
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 "
              >
                <span className="text-sm">{getPersonName(f.selectedClient)}</span>
                <Button
                  ref={removeClientRef}
                  variant="ghost"
                  size="icon"
                  aria-label={t('finance.manualEntry.removeClient')}
                  onClick={(event) => {
                    if (document.activeElement === event.currentTarget) pendingClientFocus.current = 'search'
                    f.selectClient(null)
                  }}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Label htmlFor="manual-client">{t('finance.manualEntry.client')}</Label>
              <Input
                id="manual-client"
                ref={clientSearchRef}
                value={f.clientQuery}
                onChange={(event) => f.setClientQuery(event.target.value)}
                placeholder={t('finance.manualEntry.searchClient')}
              />
              {f.clientResults.length > 0 ? (
                <ul className="max-h-40 overflow-y-auto rounded-md border border-line ">
                  {f.clientResults.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted"
                        onClick={(event) => {
                          if (document.activeElement === event.currentTarget) pendingClientFocus.current = 'remove'
                          f.selectClient(client)
                        }}
                      >
                        {getPersonName(client)}
                        <Check className="h-3.5 w-3.5 text-content-strong" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>

        <div className="grid gap-1">
          <Label htmlFor="manual-paid">{t('finance.manualEntry.paid')}</Label>
          <Input
            id="manual-paid"
            type="number"
            min={0}
            step="0.01"
            value={f.form.paidAmount}
            onChange={(event) => f.update({ paidAmount: event.target.value })}
          />
          <div className="mt-1 grid gap-1 rounded-md bg-surface-muted p-2 text-xs">
            <div className="flex justify-between">
              <span className="text-content">{t('finance.manualEntry.servicePrice')}</span>
              <span className="tabular-nums">{f.servicesUnavailable ? t('finance.manualEntry.amountUnavailable') : formatAmount(f.servicePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content">{t('finance.summary.tips')}</span>
              <span className="tabular-nums">{f.servicesUnavailable ? t('finance.manualEntry.amountUnavailable') : formatAmount(f.tipAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content">{t('finance.manualEntry.unpaid')}</span>
              <span
                className={`tabular-nums ${f.debtAmount > 0 ? 'text-warn-foreground' : ''}`}
              >
                {f.servicesUnavailable ? t('finance.manualEntry.amountUnavailable') : formatAmount(f.debtAmount)}
              </span>
            </div>
          </div>
        </div>

        {!f.servicesUnavailable && f.debtAmount > 0 ? (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t('finance.manualEntry.unpaidAmount')}</legend>
            <div className="flex gap-2">
              <Button
                variant={f.form.debtHandling === 'IGNORE_DEBT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => f.update({ debtHandling: 'IGNORE_DEBT' })}
                aria-pressed={f.form.debtHandling === 'IGNORE_DEBT'}
              >
                {t('finance.manualEntry.ignoreDebt')}
              </Button>
              <Button
                variant={f.form.debtHandling === 'CREATE_DEBT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => f.update({ debtHandling: 'CREATE_DEBT' })}
                disabled={!f.canCreateDebt}
                aria-pressed={f.form.debtHandling === 'CREATE_DEBT'}
              >
                {t('finance.manualEntry.createDebt')}
              </Button>
            </div>
            {!f.canCreateDebt ? (
              <p className="text-xs text-content-strong">
                {t('finance.manualEntry.debtRequiresClientStylist')}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <div className="grid gap-1">
          <Label htmlFor="manual-notes">{t('finance.manualEntry.notes')}</Label>
          <Textarea
            id="manual-notes"
            rows={2}
            value={f.form.notes}
            onChange={(event) => f.update({ notes: event.target.value })}
          />
        </div>

        {f.validationError ? (
          <p role="alert" className="flex items-start gap-2 border-l-4 border-danger pl-2 text-xs text-content">
            <AlertCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            {f.validationError}
          </p>
        ) : null}
      </div>
    </ResponsiveDialog>
  )
}
