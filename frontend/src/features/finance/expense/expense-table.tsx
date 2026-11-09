import { useState } from 'react'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount, getIntlLocale } from '../../../i18n/locale-utils.mjs'
import { formatInstantDateLocale } from '../../../../../shared/business-date.mjs'

import { Badge } from '../../../components/ui/badge'
import {
  DataTable,
  type DataTableColumn,
} from '../../../features/shell/admin/ui/data-table'
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

export function ExpenseTable({
  expenses,
  sortField,
  sortDirection,
  onSort,
  isLocked,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  const { t, i18n } = useTranslation()
  const [preview, setPreview] = useState<Expense | null>(null)

  const columns: DataTableColumn<Expense>[] = [
    {
      key: 'createdAt',
      headerKey: 'finance.expenseList.columns.date',
      sortKey: 'createdAt',
      className: 'whitespace-nowrap align-top',
      render: (expense) =>
        formatInstantDateLocale(expense.createdAt, getIntlLocale(i18n.language), {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }),
    },
    {
      key: 'title',
      headerKey: 'finance.expenseList.columns.title',
      sortKey: 'title',
      className: 'align-top',
      render: (expense) => {
        const notes = notesPreviewFor(expense)
        const detailLabels = detailLabelsFor(expense, t('finance.expenseList.fieldFallback'))
        return (
          <>
            <div className="font-medium text-slate-900 dark:text-slate-50">{expense.title}</div>
            {notes ? <div className="mt-0.5 text-xs text-slate-500">{notes}</div> : null}
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
                      className="text-brand-gold-text hover:underline"
                      onClick={() => setPreview(expense)}
                    >
                      {t('finance.expenseList.moreItems', {
                        count: detailLabels.length - PREVIEW_LIMIT,
                      })}
                    </button>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </>
        )
      },
    },
    {
      key: 'totalAmount',
      headerKey: 'finance.expenseList.columns.amount',
      sortKey: 'totalAmount',
      align: 'right',
      className: 'tabular-nums align-top',
      render: (expense) => formatLocalizedAmount(expense.totalAmount, i18n.language),
    },
    {
      key: 'category',
      headerKey: 'finance.expenseList.columns.category',
      className: 'align-top',
      render: (expense) => (
        <div className="flex flex-wrap items-center gap-1">
          <span>{expense.category?.name ?? '—'}</span>
          {expense.category?.isFixed ? (
            <Badge variant="secondary">{t('finance.expenseForm.fixed')}</Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'attachments',
      headerKey: 'finance.expenseList.columns.attachments',
      className: 'min-w-[160px] align-top',
      render: (expense) => (
        <ExpenseAttachmentsList attachments={expense.attachments ?? []} compact />
      ),
    },
    {
      key: 'actions',
      headerKey: 'finance.expenseList.columns.actions',
      align: 'right',
      className: 'align-top',
      render: (expense) => {
        const canPreview = hasInvoiceDetail(expense)
        return (
          <div className="flex justify-end gap-1">
            {canPreview ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('finance.expenseList.previewInvoice', { title: expense.title })}
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
                  aria-label={t('finance.expenseList.editExpense', { title: expense.title })}
                  onClick={() => onEdit(expense)}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('finance.expenseList.deleteExpense', { title: expense.title })}
                  onClick={() => onDelete(expense)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" aria-hidden="true" />
                </Button>
              </>
            ) : null}
          </div>
        )
      },
    },
  ]


  if (expenses.length === 0) {
    return (
      <EmptyState
        title={t('finance.expenseList.noExpenses')}
        description={t('finance.expenseList.noExpensesHint')}
      />
    )
  }

  return (
    <>
        <DataTable
          caption={t('finance.expenseList.caption')}
          columns={columns}
          rows={expenses}
          rowKey={(expense) => expense.id}
          sort={{ key: sortField, direction: sortDirection }}
          onSortChange={(key) => onSort(key as ExpenseSortField)}
          unsortedIndicator={false}
          rowClassName={() => 'last:border-0 dark:border-slate-900'}
        />

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
