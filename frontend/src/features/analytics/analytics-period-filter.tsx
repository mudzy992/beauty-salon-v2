import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addDateOnlyMonths, getDateTimePartsInTimeZone, parseDateOnly } from '../../../../shared/business-date.mjs'
import { Select } from '../../components/ui/select'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

type PeriodPreset = '12' | 'thisMonth' | 'lastMonth' | 'custom'

const getPresetParams = (preset: PeriodPreset, customFrom?: string, customTo?: string): Record<string, string> => {
  const now = new Date()
  const current = getDateTimePartsInTimeZone(now)
  if (preset === '12') return { monthsBack: '12' }
  if (preset === 'thisMonth') {
    return { year: String(current.year), month: String(current.month) }
  }
  if (preset === 'lastMonth') {
    const firstOfCurrentMonth = `${String(current.year).padStart(4, '0')}-${String(current.month).padStart(2, '0')}-01`
    const previous = parseDateOnly(addDateOnlyMonths(firstOfCurrentMonth, -1))
    return { year: String(previous.year), month: String(previous.month) }
  }
  if (preset === 'custom' && customFrom && customTo) return { fromDate: customFrom, toDate: customTo }
  return { monthsBack: '12' }
}

export function AnalyticsPeriodFilter({ load, periodLabel }: { load: (params: Record<string, string>) => void; periodLabel: string }) {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<PeriodPreset>('12')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const invalidRange = !!customFrom && !!customTo && customFrom > customTo

  return (
      <div className="flex flex-col flex-wrap items-stretch gap-4 md:flex-row md:items-end">
        <div className="w-full md:w-auto md:min-w-[290px]">
          <Label htmlFor="analytics-period" className="text-sm">
            {t('adminAnalytics.period')}
          </Label>
          <Select
            id="analytics-period"
            data-default-admin-field=""
            value={period}
            onChange={(e) => {
              const next = e.target.value as PeriodPreset
              setPeriod(next)
              if (next !== 'custom') load(getPresetParams(next))
            }}
            className="mt-1 flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-content shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface md:max-w-[360px]"
          >
            <option value="12">{t('adminAnalytics.last12Months')}</option>
            <option value="thisMonth">{t('adminAnalytics.thisMonth')}</option>
            <option value="lastMonth">{t('adminAnalytics.lastMonth')}</option>
            <option value="custom">{t('adminAnalytics.customRange')}</option>
          </Select>
        </div>

        {period === 'custom' ? (
          <>
            <div className="w-full md:w-auto">
              <Label htmlFor="analytics-from" className="text-sm">
                {t('adminAnalytics.from')}
              </Label>
              <Input
                id="analytics-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 md:max-w-[180px]"
              />
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="analytics-to" className="text-sm">
                {t('adminAnalytics.to')}
              </Label>
              <Input
                id="analytics-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 md:max-w-[180px]"
              />
            </div>
            <Button type="button" onClick={() => load(getPresetParams('custom', customFrom, customTo))} disabled={!customFrom || !customTo || invalidRange} className="md:mb-0.5">
              {t('adminAnalytics.apply')}
            </Button>
            {invalidRange ? <p role="alert" className="text-sm text-content">{t('adminAnalytics.invalidRange')}</p> : null}
          </>
        ) : (
          <p className="pb-1 text-sm text-content-strong md:self-center">{periodLabel}</p>
        )}
      </div>

  )
}
