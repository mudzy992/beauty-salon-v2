import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { EMPTY_EXPENSE_FILTERS } from './expenses.helpers'
import type { ExpenseCategory, ExpenseFilters } from '../finance.types'

type ExpenseFiltersBarProps = {
  filters: ExpenseFilters
  categories: ExpenseCategory[]
  onChange: (filters: ExpenseFilters) => void
  resultCount: number
  totalCount: number
}

export function ExpenseFiltersBar({
  filters,
  categories,
  onChange,
  resultCount,
  totalCount,
}: ExpenseFiltersBarProps) {
  const { t } = useTranslation()
  const isFiltered =
    JSON.stringify(filters) !== JSON.stringify(EMPTY_EXPENSE_FILTERS)
  const update = (patch: Partial<ExpenseFilters>) =>
    onChange({ ...filters, ...patch })

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor="expense-search" className="text-xs">
            {t('finance.filters.search')}
          </Label>
          <Input
            id="expense-search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder={t('finance.expenseList.searchPlaceholder')}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expense-category" className="text-xs">
            {t('finance.filters.category')}
          </Label>
          <select
            id="expense-category"
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={filters.categoryId}
            onChange={(event) => update({ categoryId: event.target.value })}
          >
            <option value="">{t('finance.expenseList.allCategories')}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expense-min" className="text-xs">
            {t('finance.filters.amountFrom')}
          </Label>
          <Input
            id="expense-min"
            type="number"
            min={0}
            value={filters.minAmount}
            onChange={(event) => update({ minAmount: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="expense-max" className="text-xs">
            {t('finance.filters.amountTo')}
          </Label>
          <Input
            id="expense-max"
            type="number"
            min={0}
            value={filters.maxAmount}
            onChange={(event) => update({ maxAmount: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={filters.onlyWithAttachments}
            onChange={(event) =>
              update({ onlyWithAttachments: event.target.checked })
            }
          />
          {t('finance.expenseList.onlyWithAttachments')}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('finance.expenseList.resultCount', { resultCount, totalCount })}
          </span>
          {isFiltered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange(EMPTY_EXPENSE_FILTERS)}
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
