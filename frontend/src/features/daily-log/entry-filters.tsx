import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Switch } from '../../components/ui/switch'
import { Label } from '../../components/ui/label'
import type { StylistOption } from './types'
import { getStylistName } from './types'
import { getCurrentMonthRange } from './date-range'

type Props = {
  fromDate: string
  toDate: string
  stylistFilter: string
  includeDeleted: boolean
  stylists: StylistOption[]
  onFromDateChange: (v: string) => void
  onToDateChange: (v: string) => void
  onStylistFilterChange: (v: string) => void
  onIncludeDeletedChange: (v: boolean) => void
  onReset: () => void
}

export const resetDailyLogFilters = (): {
  fromDate: string
  toDate: string
  stylistFilter: string
  includeDeleted: boolean
} => {
  const range = getCurrentMonthRange()
  return {
    fromDate: range.fromDate,
    toDate: range.toDate,
    stylistFilter: '',
    includeDeleted: false,
  }
}

export const DailyLogEntryFilters = ({
  fromDate,
  toDate,
  stylistFilter,
  includeDeleted,
  stylists,
  onFromDateChange,
  onToDateChange,
  onStylistFilterChange,
  onIncludeDeletedChange,
  onReset,
}: Props) => {
  const { t } = useTranslation()
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <div>
        {/* 1.3.1/3.3.2: labela je bila običan <p> — vidljiva, ali programski
            nepovezana s poljem. <Label htmlFor> je i obrazac koji već koriste
            expense-filters, income-entry-filters i reservation-filters. */}
        <Label htmlFor="daily-log-from-date" className="mb-1 block text-xs text-content-muted">
          {t('dailyLog.list.fromDate')}
        </Label>
        <Input
          id="daily-log-from-date"
          type="date"
          className="h-9 w-[160px]"
          value={fromDate}
          onChange={(e) => onFromDateChange(e.target.value)}
        />
      </div>
      <div>
        {/* 1.3.1/3.3.2: labela je bila običan <p> — vidljiva, ali programski
            nepovezana s poljem. <Label htmlFor> je i obrazac koji već koriste
            expense-filters, income-entry-filters i reservation-filters. */}
        <Label htmlFor="daily-log-to-date" className="mb-1 block text-xs text-content-muted">
          {t('dailyLog.list.toDate')}
        </Label>
        <Input
          id="daily-log-to-date"
          type="date"
          className="h-9 w-[160px]"
          value={toDate}
          onChange={(e) => onToDateChange(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="daily-log-stylist" className="mb-1 block text-xs text-content-muted">
          {t('dailyLog.list.stylist')}
        </Label>
        <select
          id="daily-log-stylist"
          value={stylistFilter}
          onChange={(e) => onStylistFilterChange(e.target.value)}
          className="flex h-9 w-[200px] rounded-md border border-input-border bg-surface px-3 text-sm text-content"
        >
          <option value="">{t('dailyLog.list.allStylists')}</option>
          {stylists.map((s) => (
            <option key={s.id} value={s.id}>
              {getStylistName(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 pb-1">
        <Switch
          id="include-deleted"
          checked={includeDeleted}
          onCheckedChange={onIncludeDeletedChange}
        />
        <Label htmlFor="include-deleted" className="text-sm">
          {t('dailyLog.list.includeDeleted')}
        </Label>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onReset}>
        {t('dailyLog.list.resetFilters')}
      </Button>
    </div>
  )
}
