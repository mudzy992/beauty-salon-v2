import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { EMPTY_INCOME_FILTERS } from './income-entries.helpers'
import type { IncomeEntryFilters } from '../finance.types'

type IncomeEntryFiltersBarProps = {
  filters: IncomeEntryFilters
  onChange: (filters: IncomeEntryFilters) => void
  resultCount: number
  totalCount: number
}

const KINDS: {
  value: IncomeEntryFilters['kind']
  labelKey:
    | 'finance.filters.all'
    | 'finance.filters.fromDailyLog'
    | 'finance.filters.manual'
}[] = [
  { value: 'ALL', labelKey: 'finance.filters.all' },
  { value: 'AUTO', labelKey: 'finance.filters.fromDailyLog' },
  { value: 'MANUAL', labelKey: 'finance.filters.manual' },
]

export function IncomeEntryFiltersBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: IncomeEntryFiltersBarProps) {
  const { t } = useTranslation()
  const isFiltered =
    JSON.stringify(filters) !== JSON.stringify(EMPTY_INCOME_FILTERS)
  const update = (patch: Partial<IncomeEntryFilters>) =>
    onChange({ ...filters, ...patch })

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor="income-search" className="text-xs">
            {t('finance.filters.search')}
          </Label>
          <Input
            id="income-search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder={t('finance.incomeList.searchPlaceholder')}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="income-stylist" className="text-xs">
            {t('finance.filters.stylist')}
          </Label>
          <Input
            id="income-stylist"
            value={filters.stylistName}
            onChange={(event) => update({ stylistName: event.target.value })}
            placeholder={t('finance.incomeList.stylistPlaceholder')}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="income-min" className="text-xs">
            {t('finance.filters.amountFrom')}
          </Label>
          <Input
            id="income-min"
            type="number"
            min={0}
            value={filters.minAmount}
            onChange={(event) => update({ minAmount: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="income-max" className="text-xs">
            {t('finance.filters.amountTo')}
          </Label>
          <Input
            id="income-max"
            type="number"
            min={0}
            value={filters.maxAmount}
            onChange={(event) => update({ maxAmount: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex gap-1"
          role="group"
          aria-label={t('finance.incomeList.kindFilterLabel')}
        >
          {KINDS.map((kind) => (
            <Button
              key={kind.value}
              variant={filters.kind === kind.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ kind: kind.value })}
              aria-pressed={filters.kind === kind.value}
            >
              {t(kind.labelKey)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('finance.incomeList.resultCount', { resultCount, totalCount })}
          </span>
          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_INCOME_FILTERS)}
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {t('finance.filters.clear')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
