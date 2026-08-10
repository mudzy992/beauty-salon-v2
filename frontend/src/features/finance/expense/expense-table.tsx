import { useState } from 'react'
import { ArrowDown, ArrowUp, Eye, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { EmptyState } from '../components/data-state'
import { ExpenseAttachmentsList } from './expense-attachments'
import { ExpenseInvoicePreview } from './expense-invoice-preview'
import {
  detailLabelsFor,
  hasInvoiceDetail,
  notesPreviewFor,
  PREVIEW_LIMIT,
} from './expense-table.helpers'
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
  const [preview, setPreview] = useState<Expense | null>(null)

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
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
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
            {expenses.map((expense) => {
              const isFixed = Boolean(expense.category?.isFixed)
              const notes = notesPreviewFor(expense)
              const detailLabels = detailLabelsFor(expense)
              const canPreview = hasInvoiceDetail(expense)
              return (
                <tr
                  key={expense.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-900"
                >
                  <td className="whitespace-nowrap py-2 pr-3 align-top">
                    {formatIsoDateBs(expense.createdAt)}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <div className="font-medium text-slate-900 dark:text-slate-50">
                      {expense.title}
                    </div>
                    {notes ? (
                      <div className="mt-0.5 text-xs text-slate-500">{notes}</div>
                    ) : null}
                    {detailLabels.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
                        {detailLabels.slice(0, PREVIEW_LIMIT).map((label) => (
                          <li key={label} className="truncate" title={label}>
                            {label}
                          </li>
                        ))}
                        {detailLabels.length > PREVIEW_LIMIT ? (
                          <li>
                            <button
                              type="button"
                              className="text-brand-gold hover:underline"
                              onClick={() => setPreview(expense)}
                            >
                              + još {detailLabels.length - PREVIEW_LIMIT} stavki — pogledaj
                              fakturu
                            </button>
                          </li>
                        ) : null}
                      </ul>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums align-top">
                    {formatMoney(expense.totalAmount)}
                  </td>
                  <td className="py-2 pr-3 align-top">
                    <div className="flex flex-wrap items-center gap-1">
                      <span>{expense.category?.name ?? '—'}</span>
                      {isFixed ? <Badge variant="secondary">fiksno</Badge> : null}
                    </div>
                  </td>
                  <td className="min-w-[160px] py-2 pr-3 align-top">
                    <ExpenseAttachmentsList
                      attachments={expense.attachments ?? []}
                      compact
                    />
                  </td>
                  <td className="py-2 text-right align-top">
                    <div className="flex justify-end gap-1">
                      {canPreview ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Pregledaj fakturu ${expense.title}`}
                          onClick={() => setPreview(expense)}
                        >
                          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      ) : null}
                      {!isLocked ? (
                        <>
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
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ExpenseInvoicePreview
        expense={preview}
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </>
  )
}
