import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { MONTHS, isFuturePeriod } from '../finance.utils'

const YEAR_SPAN = 5

type BookPeriodPickerProps = {
  year: number
  month: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  onOpen: () => void
  openLabel: string
  isPending?: boolean
}

const selectClass =
  'h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50'

export function BookPeriodPicker({
  year,
  month,
  onYearChange,
  onMonthChange,
  onOpen,
  openLabel,
  isPending = false,
}: BookPeriodPickerProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: YEAR_SPAN }, (_, i) => currentYear - i)
  const isFuture = isFuturePeriod(year, month)

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <Label htmlFor="period-month" className="text-xs">
          Mjesec
        </Label>
        <select
          id="period-month"
          className={selectClass}
          value={month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
        >
          {MONTHS.slice(1).map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="period-year" className="text-xs">
          Godina
        </Label>
        <select
          id="period-year"
          className={selectClass}
          value={year}
          onChange={(event) => onYearChange(Number(event.target.value))}
        >
          {years.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <Button onClick={onOpen} disabled={isPending || isFuture}>
        {openLabel}
      </Button>
      {isFuture ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Knjiga za budući mjesec se ne može otvoriti.
        </p>
      ) : null}
    </div>
  )
}
