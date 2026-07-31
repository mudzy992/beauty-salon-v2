import { ArrowDown, ArrowUp, Paperclip, Pencil, Trash2 } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { EmptyState } from '../components/data-state'
import { formatIsoDateBs, formatMoney } from '../finance.utils'
import type { ExpenseSortField } from './expenses.helpers'
import type { Expense, SortDirection } from '../finance.types'

type ExpenseTableProps = {
  expenses: Expense[]
  sortField: ExpenseSortField
  sortDirection: SortDirection
  onSort: (field: ExpenseSortField) => void
  isLocked: boolean
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

const COLUMNS: { field: ExpenseSortField; label: string; numeric?: boolean }[] = [
  { field: 'createdAt', label: 'Datum' },
  { field: 'title', label: 'Naziv' },
  { field: 'totalAmount', label: 'Iznos', numeric: true },
]

export function ExpenseTable({
  expenses,
  sortField,
  sortDirection,
  onSort,
  isLocked,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState
        title="Nema rashoda"
        description="Promijenite filtere ili dodajte novi rashod."
      />
    )
  }

  const SortIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Stavke knjige rashoda</caption>
        <thead>
          <tr className="border-b border-slate-200 text-left dark:border-slate-800">
            {COLUMNS.map((column) => (
              <th
                key={column.field}
                scope="col"
                className={`py-2 pr-3 font-medium ${column.numeric ? 'text-right' : ''}`}
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
                  onClick={() => onSort(column.field)}
                  aria-label={`Sortiraj po ${column.label}`}
                >
                  {column.label}
                  {sortField === column.field ? (
                    <SortIcon className="h-3 w-3" aria-hidden="true" />
                  ) : null}
                </button>
              </th>
            ))}
            <th scope="col" className="py-2 pr-3 font-medium">
              Kategorija
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Prilozi
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Akcije
            </th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr
              key={expense.id}
              className="border-b border-slate-100 last:border-0 dark:border-slate-900"
            >
              <td className="py-2 pr-3 whitespace-nowrap">
                {formatIsoDateBs(expense.createdAt)}
              </td>
              <td className="py-2 pr-3">
                <div className="font-medium text-slate-900 dark:text-slate-50">
                  {expense.title}
                </div>
                {expense.notes ? (
                  <div className="text-xs text-slate-500">{expense.notes}</div>
                ) : null}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatMoney(expense.totalAmount)}
              </td>
              <td className="py-2 pr-3">{expense.category?.name ?? '—'}</td>
              <td className="py-2 pr-3">
                {(expense.attachments ?? []).length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                    <Paperclip className="h-3 w-3" aria-hidden="true" />
                    {expense.attachments?.length}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="py-2 text-right">
                {isLocked ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Uredi rashod ${expense.title}`}
                      onClick={() => onEdit(expense)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Obriši rashod ${expense.title}`}
                      onClick={() => onDelete(expense)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
