import { useTranslation } from 'react-i18next'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { formatLocalizedAmount, formatLocalizedNumber, getIntlLocale } from '../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'
import type { ClientDebtOption, ServiceOption } from './types'
import { getStylistName } from './types'

type Props = {
  selectedServices: ServiceOption[]
  unitPrices: Record<string, number>
  onUnitPriceChange: (serviceId: string, value: number) => void
  openDebts: ClientDebtOption[]
  settleDebtsEnabled: boolean
  onSettleDebtsEnabledChange: (v: boolean) => void
  settledDebtIds: string[]
  onToggleSettledDebt: (debtId: string) => void
  chargeAmount: number
  debtsSum: number
  paidAmount: string
  onPaidAmountChange: (v: string) => void
  tipPreview: number
  shortfall: number
  createDebt: boolean
  onCreateDebtChange: (v: boolean) => void
}

const formatDate = (value: string | Date | null | undefined, language: string) => {
  const dateOnly = value?.toString().slice(0, 10)
  if (!dateOnly) return '—'
  try {
    return formatDateOnlyLocale(dateOnly, getIntlLocale(language), { dateStyle: 'medium' })
  } catch {
    return dateOnly
  }
}

export const DailyLogPricingPanel = ({
  selectedServices,
  unitPrices,
  onUnitPriceChange,
  openDebts,
  settleDebtsEnabled,
  onSettleDebtsEnabledChange,
  settledDebtIds,
  onToggleSettledDebt,
  chargeAmount,
  debtsSum,
  paidAmount,
  onPaidAmountChange,
  tipPreview,
  shortfall,
  createDebt,
  onCreateDebtChange,
}: Props) => {
  const { t, i18n } = useTranslation()

  return <div className="space-y-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
    {selectedServices.length > 0 ? (
      <div className="space-y-2">
        <Label>{t('dailyLog.form.servicePrices')}</Label>
        {selectedServices.map((svc) => (
          <div key={svc.id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm">{svc.name}</span>
            <Input
              className="h-8 w-24 text-right"
              type="number"
              min={0}
              step="0.01"
              value={unitPrices[svc.id] ?? Number(svc.price)}
              onChange={(e) =>
                onUnitPriceChange(svc.id, Number(e.target.value.replace(',', '.')) || 0)
              }
              aria-label={t('dailyLog.form.priceForService', { service: svc.name })}
            />
            <span className="text-xs text-slate-500">KM</span>
          </div>
        ))}
      </div>
    ) : null}
    {openDebts.length > 0 ? (
      <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t('dailyLog.form.openDebts', {
            items: formatLocalizedNumber(openDebts.length, i18n.language),
            amount: formatLocalizedAmount(openDebts.reduce((a, d) => a + Number(d.amount), 0), i18n.language),
          })}
        </p>
        <div className="flex items-center gap-2">
          <Switch
            id="settle-debts"
            checked={settleDebtsEnabled}
            onCheckedChange={onSettleDebtsEnabledChange}
          />
          <Label htmlFor="settle-debts">{t('dailyLog.form.settleDebt')}</Label>
        </div>
        {settleDebtsEnabled
          ? openDebts.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-start gap-2 rounded border border-slate-100 p-2 text-sm dark:border-slate-800"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={settledDebtIds.includes(d.id)}
                  onChange={() => onToggleSettledDebt(d.id)}
                />
                <span className="min-w-0 flex-1">
                  {t('dailyLog.form.debtItem', {
                    service: d.service?.name ?? t('dailyLog.form.serviceFallback'),
                    date: formatDate(d.dailyLogEntry?.date ?? d.createdAt, i18n.language),
                    stylist: getStylistName(d.stylistProfile),
                  })}
                </span>
                <span className="font-medium tabular-nums">{formatLocalizedAmount(Number(d.amount), i18n.language)}</span>
              </label>
            ))
          : null}
      </div>
    ) : null}
    <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
      <p className="text-sm font-semibold">
        {t('dailyLog.form.amountToCollect', { amount: formatLocalizedAmount(chargeAmount, i18n.language) })}
        {debtsSum > 0 ? (
          <span className="ml-1 text-xs font-normal text-slate-500">
            {t('dailyLog.form.includingDebts', { amount: formatLocalizedAmount(debtsSum, i18n.language) })}
          </span>
        ) : null}
      </p>
      <Label className="mt-2 block">{t('dailyLog.form.amountPaid')}</Label>
      <Input
        className="mt-1"
        value={paidAmount}
        onChange={(e) => onPaidAmountChange(e.target.value)}
        placeholder={chargeAmount > 0 ? chargeAmount.toFixed(2) : '0.00'}
      />
      {tipPreview > 0 ? (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          {t('dailyLog.form.tip', { amount: formatLocalizedAmount(tipPreview, i18n.language) })}
        </p>
      ) : null}
      {shortfall > 0 ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t('dailyLog.form.shortfall', { amount: formatLocalizedAmount(shortfall, i18n.language) })}
          </p>
          <div className="flex items-center gap-2">
            <Switch id="create-debt" checked={createDebt} onCheckedChange={onCreateDebtChange} />
            <Label htmlFor="create-debt">{t('dailyLog.form.createDebt')}</Label>
          </div>
        </div>
      ) : null}
    </div>
  </div>
}
