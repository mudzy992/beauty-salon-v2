import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  formatLocalizedAmount,
  getIntlLocale,
} from '../../../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'

import { DataTable, type DataTableColumn } from '../../../features/shell/admin/ui/data-table'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { EmptyState } from '../components/data-state'
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

const DATE_OPTIONS = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
} as const

const formatIncomeDate = (value: string, language: string): string => {
  if (!value) return '—'
  try {
    return formatDateOnlyLocale(
      value.slice(0, 10),
      getIntlLocale(language),
      DATE_OPTIONS,
    )
  } catch {
    return '—'
  }
}

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
  const { t, i18n } = useTranslation()
  if (rows.length === 0) {
    return (
      <EmptyState
        title={t('finance.incomeList.noEntries')}
        description={t('finance.incomeList.noEntriesHint')}
      />
    )
  }


  const columns: DataTableColumn<IncomeEntryRow>[] = [
    {
      key: 'date',
      headerKey: 'finance.incomeList.columns.date',
      sortKey: 'date',
      className: 'whitespace-nowrap',
      render: (row) => formatIncomeDate(row.date, i18n.language),
    },
    {
      key: 'serviceName',
      headerKey: 'finance.incomeList.columns.service',
      sortKey: 'serviceName',
      className: 'align-top',
      render: (row) => {
        const serviceNames = serviceNamesForRow(row)
        return (
          // `title` je prije stajao na <td>; DataTable ne prima atribute po celiji, pa je
          // ocuvan omotacem - tooltip za skrateni tekst nije smio biti izgubljen.
          <span title={row.serviceName} className="block">
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
          </span>
        )
      },
    },
    {
      key: 'amount',
      headerKey: 'finance.incomeList.columns.revenue',
      sortKey: 'amount',
      align: 'right',
      className: 'tabular-nums',
      render: (row) => formatLocalizedAmount(row.amount, i18n.language),
    },
    {
      key: 'tipAmount',
      headerKey: 'finance.incomeList.columns.tips',
      sortKey: 'tipAmount',
      align: 'right',
      className: 'tabular-nums text-slate-500',
      render: (row) =>
        row.tipAmount > 0 ? formatLocalizedAmount(row.tipAmount, i18n.language) : '—',
    },
    { key: 'stylist', headerKey: 'finance.incomeList.columns.stylist', render: (row) => row.stylistName },
    { key: 'client', headerKey: 'finance.incomeList.columns.client', render: (row) => row.clientName },
    {
      key: 'kind',
      headerKey: 'finance.incomeList.columns.kind',
      render: (row) => (
        <Badge variant={row.kind === 'MANUAL' ? 'secondary' : 'outline'}>
          {t(row.kind === 'MANUAL' ? 'finance.filters.manual' : 'finance.filters.fromDailyLog')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      headerKey: 'finance.incomeList.columns.actions',
      align: 'right',
      render: (row) =>
        row.manualEntry && !isLocked ? (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('finance.incomeList.editManualEntry')}
              onClick={() => onEdit(row.manualEntry as IncomeBookManualEntry)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('finance.incomeList.deleteManualEntry')}
              onClick={() => onDelete(row.manualEntry as IncomeBookManualEntry)}
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-content-muted">
            —
            <span className="sr-only">{t('finance.incomeList.noActions')}</span>
          </span>
        ),
    },
  ]


  return (
      <DataTable
        caption={t('finance.incomeList.caption')}
        columns={columns}
        rows={rows}
        rowKey={(row) => `${row.kind}-${row.id}`}
        sort={{ key: sortField, direction: sortDirection }}
        onSortChange={(key) => onSort(key as IncomeSortField)}
        unsortedIndicator={false}
        rowClassName={() => 'last:border-0 dark:border-slate-900'}
      />
  )
}
