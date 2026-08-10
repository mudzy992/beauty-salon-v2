import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useAppToast } from '../lib/toast/useAppToast'
import { Button } from '../components/ui/button'
import { DailyLogEntryTable } from '../features/daily-log/entry-table'
import { DailyLogEntryFormDialog } from '../features/daily-log/entry-form-dialog'
import { DailyLogDeleteDialog } from '../features/daily-log/entry-delete-dialog'
import { DailyLogStats } from '../features/daily-log/entry-stats'
import { DailyLogEntryFilters } from '../features/daily-log/entry-filters'
import { useDailyLogData } from '../features/daily-log/use-daily-log-data'
import { useDailyLogForm } from '../features/daily-log/use-daily-log-form'
import { useDailyLogMutations } from '../features/daily-log/use-daily-log-mutations'

export default function DailyLog() {
  const { t } = useTranslation()
  const toast = useAppToast()
  const data = useDailyLogData()
  const form = useDailyLogForm({
    services: data.services,
    loadData: data.loadData,
    toast,
  })
  const mutations = useDailyLogMutations({
    loadData: data.loadData,
    setSaving: form.setSaving,
    toast,
  })

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {t('nav.dailyLog')}
        </h1>
        <Button type="button" onClick={form.openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Novi Unos
        </Button>
      </div>
      <DailyLogStats entries={data.entries} />
      <DailyLogEntryFilters
        fromDate={data.fromDate}
        toDate={data.toDate}
        stylistFilter={data.stylistFilter}
        includeDeleted={data.includeDeleted}
        stylists={data.stylists}
        onFromDateChange={data.setFromDate}
        onToDateChange={data.setToDate}
        onStylistFilterChange={data.setStylistFilter}
        onIncludeDeletedChange={data.setIncludeDeleted}
        onReset={data.handleResetFilters}
      />
      <DailyLogEntryTable
        entries={data.entries}
        loading={data.loading}
        noDataLabel={t('common.noData')}
        onEdit={form.openEditForm}
        onComplete={(id) => void mutations.handleComplete(id)}
        onDelete={(entry) => {
          mutations.setDeleteTarget(entry)
          mutations.setDeleteReason('')
        }}
        onRestore={(id) => void mutations.handleRestore(id)}
      />
      <DailyLogEntryFormDialog
        open={form.open}
        onOpenChange={form.setOpen}
        editId={form.editId}
        form={form.form}
        setForm={form.setForm}
        stylists={data.stylists}
        services={data.services}
        clients={data.clients}
        paidAmount={form.paidAmount}
        setPaidAmount={form.setPaidAmount}
        chargeAmount={form.chargeAmount}
        debtsSum={form.debtsSum}
        tipPreview={form.tipPreview}
        shortfall={form.shortfall}
        createDebt={form.createDebt}
        setCreateDebt={form.setCreateDebt}
        openDebts={form.openDebts}
        settleDebtsEnabled={form.settleDebtsEnabled}
        setSettleDebtsEnabled={form.setSettleDebtsEnabled}
        settledDebtIds={form.settledDebtIds}
        onToggleSettledDebt={form.onToggleSettledDebt}
        setUnitPrice={form.setUnitPrice}
        toggleService={form.toggleService}
        loyaltyPercent={form.loyaltyPercent}
        loyaltyDiscountAmount={form.loyaltyDiscountAmount}
        loyaltyInfo={form.loyaltyInfo}
        loadingLoyalty={form.loadingLoyalty}
        saving={form.saving}
        onSave={() => void form.handleSave()}
        cancelLabel={t('common.cancel')}
        saveLabel={t('common.save')}
      />
      <DailyLogDeleteDialog
        open={!!mutations.deleteTarget}
        onOpenChange={(v) => {
          if (!v) mutations.setDeleteTarget(null)
        }}
        entry={mutations.deleteTarget}
        reason={mutations.deleteReason}
        onReasonChange={mutations.setDeleteReason}
        saving={form.saving}
        onConfirm={() => void mutations.handleDelete()}
      />
    </div>
  )
}
