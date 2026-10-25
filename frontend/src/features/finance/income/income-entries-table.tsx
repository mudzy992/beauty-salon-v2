import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { EmptyState } from '../components/data-state'
import { formatDateOnlyBs, formatMoney } from '../finance.utils'
import {
  resolveIncomeServiceNames,
  type IncomeSortField,
} from './income-entries.helpers'
import type {
  IncomeBookManualEntry,
  IncomeEntryRow,
  SortDirection,
} from '../finance.types'

type IncomeEntriesTableProps = {
  rows: IncomeEntryRow[]
  sortField: IncomeSortField
  sortDirection: SortDirection
  onSort: (field: IncomeSortField) => void
  isLocked: boolean
  onEdit: (entry: IncomeBookManualEntry) => void
  onDelete: (entry: IncomeBookManualEntry) => void
}

const COLUMNS: { field: IncomeSortField; label: string; numeric?: boolean }[] = [
  { field: 'date', label: 'Datum' },
  { field: 'serviceName', label: 'Servis' },
  { field: 'amount', label: 'Prihod', numeric: true },
  { field: 'tipAmount', label: 'Napojnica', numeric: true },
]

const serviceNamesForRow = (row: IncomeEntryRow): string[] => {
  if (row.kind === 'AUTO') {
    return resolveIncomeServiceNames(row.autoEntry?.dailyLogEntry)
  }
  return row.serviceName && row.serviceName !== '—' ? [row.serviceName] : []
}

export function IncomeEntriesTable({
  rows,
  sortField,
  sortDirection,
  onSort,
  isLocked,
  onEdit,
  onDelete,
}: IncomeEntriesTableProps) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nema stavki"
        description="Promijenite filtere ili dodajte ručni prihod."
      />
    )
  }

  const SortIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown

  return (
    <div className="app-table-wrap">
      <table className="app-table w-full">
        <caption className="sr-only">Stavke knjige prihoda</caption>
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
              Stilista
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Klijent
            </th>
            <th scope="col" className="py-2 pr-3 font-medium">
              Vrsta
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Akcije
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const serviceNames = serviceNamesForRow(row)
            return (
            <tr
              key={`${row.kind}-${row.id}`}
              className="border-b border-slate-100 last:border-0 dark:border-slate-900"
            >
              <td className="py-2 pr-3 whitespace-nowrap">
                {formatDateOnlyBs(row.date)}
              </td>
              <td className="py-2 pr-3 align-top" title={row.serviceName}>
                {serviceNames.length === 0 ? (
                  '—'
                ) : (
                  <ul className="space-y-0.5">
                    {serviceNames.map((name, index) => (
                      <li key={`${name}-${index}`} className="truncate">
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">
                {formatMoney(row.amount)}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                {row.tipAmount > 0 ? formatMoney(row.tipAmount) : '—'}
              </td>
              <td className="py-2 pr-3">{row.stylistName}</td>
              <td className="py-2 pr-3">{row.clientName}</td>
              <td className="py-2 pr-3">
                <Badge variant={row.kind === 'MANUAL' ? 'secondary' : 'outline'}>
                  {row.kind === 'MANUAL' ? 'Ručno' : 'Dnevnik'}
                </Badge>
              </td>
              <td className="py-2 text-right">
                {row.manualEntry && !isLocked ? (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Uredi ručni prihod"
                      onClick={() => onEdit(row.manualEntry as IncomeBookManualEntry)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Obriši ručni prihod"
                      onClick={() => onDelete(row.manualEntry as IncomeBookManualEntry)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
