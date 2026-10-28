import { useTranslation } from 'react-i18next'
import { formatMonthName } from '../../../i18n/locale-utils.mjs'

import { Button } from '../../../components/ui/button'
import { Label } from '../../../components/ui/label'
import { isFuturePeriod } from '../finance.utils'
import { getDateTimePartsInTimeZone } from '../../../../../shared/business-date.mjs'

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
  const { t, i18n } = useTranslation()
  const currentYear = getDateTimePartsInTimeZone(new Date()).year
  const years = Array.from({ length: YEAR_SPAN }, (_, i) => currentYear - i)
  const isFuture = isFuturePeriod(year, month)

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <Label htmlFor="period-month" className="text-xs">
          {t('finance.book.month')}
        </Label>
        <select
          id="period-month"
          className={selectClass}
          value={month}
          onChange={(event) => onMonthChange(Number(event.target.value))}
        >
          {Array.from({ length: 12 }, (_, index) => {
            const value = index + 1
            const name = formatMonthName(value, i18n.language)
            return (
              <option key={value} value={value}>
                {name}
              </option>
            )
          })}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="period-year" className="text-xs">
          {t('finance.book.year')}
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
          {t('finance.book.futureMonthCannotOpen')}
        </p>
      ) : null}
    </div>
  )
}
