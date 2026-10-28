import { useMemo, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import {
  BookLockBadge,
  BookLockControls,
} from '../components/book-lock-controls'
import { ConfirmDialog } from '../components/confirm-dialog'
import { ErrorState, TableSkeleton } from '../components/data-state'
import { ExportMenu } from '../components/export-menu'
import { HistoryPanel } from '../components/history-panel'
import { SummaryCards } from '../components/summary-cards'
import { ExpenseDialog } from './expense-dialog'
import { ExpenseFiltersBar } from './expense-filters'
import { ExpenseTable } from './expense-table'
import {
  EMPTY_EXPENSE_FILTERS,
  filterExpenses,
  sortExpenses,
  sumExpenses,
  type ExpenseSortField,
} from './expenses.helpers'
import { formatExpenseNotesSummary } from './expense-notes'
import {
  useExpenseBook,
  useExpenseBookMutations,
} from '../hooks/use-expense-books'
import { useExpenseCategories } from '../hooks/use-expense-catalog'
import { exportRowsToCsv, printReport } from '../export.utils'
import {
  formatInstantDateLocalized,
  formatPeriod,
  toNumber,
} from '../finance.utils'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type {
  Expense,
  ExpenseFilters,
  ExpensePayload,
  SortDirection,
} from '../finance.types'

export function ExpenseBookDetail({
  bookId,
  onBack,
}: {
  bookId: string
  onBack: () => void
}) {
  const { t, i18n } = useTranslation()
  const { success, toastApiError } = useAppToast()
  const bookQuery = useExpenseBook(bookId)
  const categoriesQuery = useExpenseCategories()
  const mutations = useExpenseBookMutations(bookId)

  const [filters, setFilters] = useState<ExpenseFilters>(EMPTY_EXPENSE_FILTERS)
  const [sortField, setSortField] = useState<ExpenseSortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null)

  const book = bookQuery.data
  const allExpenses = useMemo(() => book?.expenses ?? [], [book])
  const expenses = useMemo(
    () =>
      sortExpenses(
        filterExpenses(allExpenses, filters),
        sortField,
        sortDirection,
      ),
    [allExpenses, filters, sortField, sortDirection],
  )
  const filteredTotal = useMemo(() => sumExpenses(expenses), [expenses])

  const handleSort = (field: ExpenseSortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const handleSave = async (payload: ExpensePayload) => {
    try {
      await mutations.saveExpense.mutateAsync({
        expenseId: editing?.id,
        payload,
      })
      success(
        editing
          ? t('finance.expenseDetail.expenseUpdated')
          : t('finance.expenseDetail.expenseAdded'),
      )
      setIsDialogOpen(false)
      setEditing(null)
    } catch (err) {
      toastApiError(err, t('finance.expenseDetail.saveFailed'))
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await mutations.removeExpense.mutateAsync(pendingDelete.id)
      success(t('finance.expenseDetail.expenseDeleted'))
    } catch (err) {
      toastApiError(err, t('finance.expenseDetail.deleteFailed'))
    } finally {
      setPendingDelete(null)
    }
  }

  const handleLock = async () => {
    try {
      await mutations.lock.mutateAsync()
      success(t('finance.expenseDetail.bookLockedSuccess'))
    } catch (err) {
      toastApiError(err, t('finance.expenseDetail.lockFailed'))
    }
  }

  const handleUnlock = async (reason: string) => {
    try {
      await mutations.unlock.mutateAsync(reason)
      success(t('finance.expenseDetail.bookUnlockedSuccess'))
    } catch (err) {
      toastApiError(err, t('finance.expenseDetail.unlockFailed'))
    }
  }

  if (bookQuery.isLoading) return <TableSkeleton rows={6} columns={5} />
  if (bookQuery.isError || !book) {
    return (
      <ErrorState
        description={t('finance.expenseDetail.errorDescription')}
        onRetry={() => void bookQuery.refetch()}
      />
    )
  }

  const period = formatPeriod(book.year, book.month, i18n.language)
  const isLocked = book.isClosed

  const handleExportCsv = () =>
    exportRowsToCsv({
      filename: `KUF-${book.year}-${String(book.month).padStart(2, '0')}`,
      columns: [
        {
          header: t('finance.expenseList.columns.date'),
          value: (e: Expense) =>
            formatInstantDateLocalized(e.createdAt, i18n.language),
        },
        {
          header: t('finance.expenseList.columns.title'),
          value: (e: Expense) => e.title,
        },
        {
          header: t('finance.expenseList.columns.category'),
          value: (e: Expense) => e.category?.name ?? '',
        },
        {
          header: t('finance.expenseList.columns.amount'),
          value: (e: Expense) => toNumber(e.totalAmount).toFixed(2),
        },
        {
          header: t('finance.expenseForm.notes'),
          value: (e: Expense) => {
            const fields = e.category?.template?.fields ?? []
            const n = formatExpenseNotesSummary(e.notes, fields)
            return [n.userNotes, ...n.lineLabels].filter(Boolean).join(' | ')
          },
        },
      ],
      rows: expenses,
      summary: [
        t('finance.expenseDetail.csvTotal'),
        '',
        '',
        filteredTotal.toFixed(2),
        '',
      ],
    })

  const handlePrint = () =>
    printReport({
      title: t('finance.expenseDetail.printTitle', { period }),
      subtitle: t('finance.expenseDetail.printSubtitle', {
        count: expenses.length,
        status: t(
          isLocked
            ? 'finance.expenseDetail.statusLocked'
            : 'finance.expenseDetail.statusOpen',
        ),
      }),
      language: i18n.language.startsWith('en') ? 'en' : 'bs',
      headers: [
        t('finance.expenseList.columns.date'),
        t('finance.expenseForm.title'),
        t('finance.expenseList.columns.category'),
        t('finance.expenseList.columns.amount'),
      ],
      rows: expenses.map((e) => [
        formatInstantDateLocalized(e.createdAt, i18n.language),
        e.title,
        e.category?.name ?? '—',
        formatLocalizedAmount(e.totalAmount, i18n.language),
      ]),
      summary: [
        {
          label: t('finance.summary.totalExpenses'),
          value: formatLocalizedAmount(filteredTotal, i18n.language),
        },
      ],
    })

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label={t('finance.expenseDetail.backToList')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {period}
          </h2>
          <BookLockBadge isLocked={isLocked} />
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu
            onExportCsv={handleExportCsv}
            onPrint={handlePrint}
            disabled={expenses.length === 0}
          />
          <BookLockControls
            isLocked={isLocked}
            year={book.year}
            month={book.month}
            isPending={mutations.lock.isPending || mutations.unlock.isPending}
            onLock={handleLock}
            onUnlock={handleUnlock}
          />
          <Button
            size="sm"
            onClick={() => {
              setEditing(null)
              setIsDialogOpen(true)
            }}
            disabled={isLocked}
          >
            <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            {t('finance.expenseDetail.newExpense')}
          </Button>
        </div>
      </div>

      <SummaryCards
        items={[
          {
            label: t('finance.summary.totalExpenses'),
            value:
              book.totalExpenses == null
                ? sumExpenses(allExpenses)
                : toNumber(book.totalExpenses),
            tone: 'negative',
          },
          {
            label: t('finance.summary.filtered'),
            value: filteredTotal,
            tone: 'muted',
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('finance.expenseDetail.expensesTitle', {
              count: expenses.length,
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ExpenseFiltersBar
            filters={filters}
            categories={categoriesQuery.data ?? []}
            onChange={setFilters}
            resultCount={expenses.length}
            totalCount={allExpenses.length}
          />
          <ExpenseTable
            expenses={expenses}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            isLocked={isLocked}
            onEdit={(expense) => {
              setEditing(expense)
              setIsDialogOpen(true)
            }}
            onDelete={setPendingDelete}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <HistoryPanel
            title={t('finance.book.lockHistory')}
            events={book.lockEvents ?? []}
            emptyLabel={t('finance.incomeDetail.lockHistoryEmpty')}
          />
        </CardContent>
      </Card>

      <ExpenseDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) setEditing(null)
        }}
        bookId={bookId}
        editing={editing}
        categories={categoriesQuery.data ?? []}
        isSaving={mutations.saveExpense.isPending}
        onSubmit={(payload) => void handleSave(payload)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={t('finance.expenseDetail.deleteTitle')}
        description={t('finance.expenseDetail.deleteDescription', {
          title: pendingDelete?.title ?? '',
        })}
        confirmLabel={t('finance.expenseDetail.deleteConfirm')}
        isDestructive
        isPending={mutations.removeExpense.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
