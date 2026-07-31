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
}: Props) => (
  <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
    <div>
      <p className="mb-1 text-xs text-slate-500">Od datuma</p>
      <Input
        type="date"
        className="h-9 w-[160px]"
        value={fromDate}
        onChange={(e) => onFromDateChange(e.target.value)}
      />
    </div>
    <div>
      <p className="mb-1 text-xs text-slate-500">Do datuma</p>
      <Input
        type="date"
        className="h-9 w-[160px]"
        value={toDate}
        onChange={(e) => onToDateChange(e.target.value)}
      />
    </div>
    <div>
      <p className="mb-1 text-xs text-slate-500">Stilista</p>
      <select
        value={stylistFilter}
        onChange={(e) => onStylistFilterChange(e.target.value)}
        className="flex h-9 w-[200px] rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
      >
        <option value="">Svi stilisti</option>
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
        Prikaži obrisane
      </Label>
    </div>
    <Button type="button" size="sm" variant="outline" onClick={onReset}>
      Resetuj
    </Button>
  </div>
)
