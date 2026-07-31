import { X } from 'lucide-react'

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

const KINDS: { value: IncomeEntryFilters['kind']; label: string }[] = [
  { value: 'ALL', label: 'Sve' },
  { value: 'AUTO', label: 'Iz dnevnika' },
  { value: 'MANUAL', label: 'Ručne' },
]

export function IncomeEntryFiltersBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: IncomeEntryFiltersBarProps) {
  const isFiltered =
    JSON.stringify(filters) !== JSON.stringify(EMPTY_INCOME_FILTERS)
  const update = (patch: Partial<IncomeEntryFilters>) =>
    onChange({ ...filters, ...patch })

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor="income-search" className="text-xs">
            Pretraga
          </Label>
          <Input
            id="income-search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Servis, klijent, napomena…"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="income-stylist" className="text-xs">
            Stilista
          </Label>
          <Input
            id="income-stylist"
            value={filters.stylistName}
            onChange={(event) => update({ stylistName: event.target.value })}
            placeholder="Ime stiliste"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="income-min" className="text-xs">
            Iznos od
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
            Iznos do
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
          aria-label="Filtriraj po vrsti stavke"
        >
          {KINDS.map((kind) => (
            <Button
              key={kind.value}
              variant={filters.kind === kind.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => update({ kind: kind.value })}
              aria-pressed={filters.kind === kind.value}
            >
              {kind.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Prikazano {resultCount} od {totalCount}
          </span>
          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_INCOME_FILTERS)}
            >
              <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Očisti
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
