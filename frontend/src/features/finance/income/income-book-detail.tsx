import { useMemo, useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { BookLockBadge, BookLockControls } from '../components/book-lock-controls'
import { ConfirmDialog } from '../components/confirm-dialog'
import { ErrorState, TableSkeleton } from '../components/data-state'
import { ExportMenu } from '../components/export-menu'
import { HistoryPanel } from '../components/history-panel'
import { SummaryCards } from '../components/summary-cards'
import { IncomeEntriesTable } from './income-entries-table'
import { IncomeEntryFiltersBar } from './income-entry-filters'
import { IntegrityPanel } from './integrity-panel'
import { ManualEntryDialog } from './manual-entry-dialog'
import {
  EMPTY_INCOME_FILTERS,
  filterIncomeRows,
  sortIncomeRows,
  summarizeIncomeRows,
  toIncomeEntryRows,
  type IncomeSortField,
} from './income-entries.helpers'
import {
  useIncomeBook,
  useIncomeBookIntegrity,
  useIncomeBookMutations,
} from '../hooks/use-income-books'
import { exportRowsToCsv, printReport } from '../export.utils'
import { formatDateOnlyBs, formatMoney, formatPeriod } from '../finance.utils'
import { useAppToast } from '../../../lib/toast/useAppToast'
import type {
  IncomeBookManualEntry,
  IncomeEntryFilters,
  ManualEntryPayload,
  SortDirection,
} from '../finance.types'

export function IncomeBookDetail({
  bookId,
  onBack,
}: {
  bookId: string
  onBack: () => void
}) {
  const { t } = useTranslation()
  const { success, toastApiError } = useAppToast()
  const bookQuery = useIncomeBook(bookId)
  const integrityQuery = useIncomeBookIntegrity(bookId)
  const mutations = useIncomeBookMutations(bookId)

  const [filters, setFilters] = useState<IncomeEntryFilters>(EMPTY_INCOME_FILTERS)
  const [sortField, setSortField] = useState<IncomeSortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [editing, setEditing] = useState<IncomeBookManualEntry | null>(null)
  const [pendingDelete, setPendingDelete] = useState<IncomeBookManualEntry | null>(null)

  const book = bookQuery.data
  const allRows = useMemo(() => toIncomeEntryRows(book), [book])
  const rows = useMemo(
    () => sortIncomeRows(filterIncomeRows(allRows, filters), sortField, sortDirection),
    [allRows, filters, sortField, sortDirection],
  )
  const summary = useMemo(() => summarizeIncomeRows(rows), [rows])

  const handleSort = (field: IncomeSortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection('asc')
  }

  const handleSaveManual = async (payload: ManualEntryPayload) => {
    try {
      await mutations.saveManualEntry.mutateAsync({ entryId: editing?.id, payload })
      success(editing ? 'Stavka je izmijenjena.' : 'Stavka je dodana.')
      setIsManualOpen(false)
      setEditing(null)
    } catch (err) {
      toastApiError(err, 'Čuvanje stavke nije uspjelo')
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      await mutations.removeManualEntry.mutateAsync(pendingDelete.id)
      success('Stavka je obrisana.')
    } catch (err) {
      toastApiError(err, 'Brisanje nije uspjelo')
    } finally {
      setPendingDelete(null)
    }
  }

  const handleLock = async () => {
    try {
      await mutations.lock.mutateAsync()
      success('Knjiga je zaključana.')
    } catch (err) {
      toastApiError(err, 'Zaključavanje nije uspjelo')
    }
  }

  const handleUnlock = async (reason: string) => {
    try {
      await mutations.unlock.mutateAsync(reason)
      success('Knjiga je otključana.')
    } catch (err) {
      toastApiError(err, 'Otključavanje nije uspjelo')
    }
  }

  const handleResync = async () => {
    try {
      const result = await mutations.resync.mutateAsync()
      success('Sinhronizacija je završena.')
      return result
    } catch (err) {
      toastApiError(err, 'Sinhronizacija nije uspjela')
    }
  }

  if (bookQuery.isLoading) return <TableSkeleton rows={6} columns={6} />
  if (bookQuery.isError || !book) {
    return (
      <ErrorState
        description="Knjigu prihoda nije moguće učitati."
        onRetry={() => void bookQuery.refetch()}
      />
    )
  }

  const period = formatPeriod(book.year, book.month)
  const isLocked = Boolean(book.closedAt)

  const handleExportCsv = () =>
    exportRowsToCsv({
      filename: `KIF-${book.year}-${String(book.month).padStart(2, '0')}`,
      columns: [
        { header: 'Datum', value: (r) => formatDateOnlyBs(r.date) },
        { header: 'Servis', value: (r) => r.serviceName },
        { header: 'Stilista', value: (r) => r.stylistName },
        { header: 'Klijent', value: (r) => r.clientName },
        { header: 'Vrsta', value: (r) => (r.kind === 'MANUAL' ? 'Ručno' : 'Dnevnik') },
        { header: 'Prihod', value: (r) => r.amount.toFixed(2) },
        { header: 'Napojnica', value: (r) => r.tipAmount.toFixed(2) },
      ],
      rows,
      summary: [
        'UKUPNO',
        '',
        '',
        '',
        '',
        summary.revenue.toFixed(2),
        summary.tips.toFixed(2),
      ],
    })

  const handlePrint = () =>
    printReport({
      title: `Knjiga prihoda – ${period}`,
      subtitle: `${summary.count} stavki · ${isLocked ? 'zaključana' : 'otvorena'}`,
      headers: ['Datum', 'Servis', 'Stilista', 'Klijent', 'Prihod', 'Napojnica'],
      rows: rows.map((r) => [
        formatDateOnlyBs(r.date),
        r.serviceName,
        r.stylistName,
        r.clientName,
        formatMoney(r.amount),
        formatMoney(r.tipAmount),
      ]),
      summary: [
        { label: 'Prihod bez napojnice', value: formatMoney(summary.revenue) },
        { label: 'Napojnice', value: formatMoney(summary.tips) },
        { label: 'Ukupno naplaćeno', value: formatMoney(summary.total) },
      ],
    })

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} aria-label="Nazad na listu">
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
            disabled={rows.length === 0}
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
              setIsManualOpen(true)
            }}
            disabled={isLocked}
          >
            <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Ručni prihod
          </Button>
        </div>
      </div>

      <SummaryCards
        items={[
          { label: t('finance.summary.revenue'), value: summary.revenue },
          { label: t('finance.summary.tips'), value: summary.tips, tone: 'muted' },
          {
            label: t('finance.summary.totalCollected'),
            value: summary.total,
            tone: 'positive',
          },
        ]}
      />

      <IntegrityPanel
        report={integrityQuery.data}
        isLoading={integrityQuery.isLoading}
        isResyncing={mutations.resync.isPending}
        onResync={() => void handleResync()}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stavke ({summary.count})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <IncomeEntryFiltersBar
            filters={filters}
            onChange={setFilters}
            resultCount={rows.length}
            totalCount={allRows.length}
          />
          <IncomeEntriesTable
            rows={rows}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            isLocked={isLocked}
            onEdit={(entry) => {
              setEditing(entry)
              setIsManualOpen(true)
            }}
            onDelete={setPendingDelete}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <HistoryPanel
              title={t('finance.book.lockHistory')}
              events={book.lockEvents ?? []}
              emptyLabel="Nema zabilježenih zaključavanja."
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <HistoryPanel
              title={t('finance.book.auditHistory')}
              events={(book.manualAudits ?? []).map((audit) => ({
                id: audit.id,
                action: audit.action,
                createdAt: audit.createdAt,
                createdBy: audit.createdBy,
              }))}
              emptyLabel="Nema izmjena ručnih stavki."
            />
          </CardContent>
        </Card>
      </div>

      <ManualEntryDialog
        open={isManualOpen}
        onOpenChange={(open) => {
          setIsManualOpen(open)
          if (!open) setEditing(null)
        }}
        year={book.year}
        month={book.month}
        editing={editing}
        isSaving={mutations.saveManualEntry.isPending}
        onSubmit={(payload) => void handleSaveManual(payload)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Obrisati stavku?"
        description="Ako je uz stavku evidentiran otvoren dug, i on će biti obrisan."
        confirmLabel="Obriši"
        isDestructive
        isPending={mutations.removeManualEntry.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
