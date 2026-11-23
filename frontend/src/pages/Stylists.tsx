import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Loader2, Pencil } from 'lucide-react'

import { getIntlLocale } from '../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

import { DataTable, type DataTableColumn } from '../features/shell/admin/ui/data-table'
import { EmptyState } from '../features/shell/admin/ui/data-state'
import { StylistEditorDialog } from '../features/salon/stylist-editor-dialog'
import type { StylistProfile } from '../features/salon/stylist-types'
import { useStylistManagement } from '../features/salon/use-stylist-management'

export default function Stylists() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { stylists, loading, saving, page, setPage, pageSize, total, open, setOpen, selectedStylist, allServices, form, setForm, workingHours, stylistServiceIds, openEditForm, handleSaveAll, updateWH, toggleService, selectedServices, unselectedServices } = useStylistManagement()

  const stylistColumns: DataTableColumn<StylistProfile>[] = [
    {
      key: 'user',
      headerKey: 'stylists.table.user',
      className: 'p-3 font-medium text-content',
      render: (s) =>
        s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''} (${s.user.username})`.trim() : s.userId,
    },
    {
      key: 'email',
      headerKey: 'stylists.table.email',
      className: 'p-3',
      render: (s) => s.user?.email ?? '-',
    },
    {
      key: 'specialization',
      headerKey: 'stylists.table.specialization',
      className: 'p-3',
      render: (s) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{s.specialization ?? '-'}</span>
          {String(s.status ?? '').toUpperCase() === 'PENDING' ? (
            <Badge variant="warning" className="text-[10px]">
              {t('stylists.status.pending')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'hireDate',
      headerKey: 'stylists.table.hireDate',
      className: 'p-3',
      render: (s) => (s.hireDate ? formatDateOnlyLocale(s.hireDate.slice(0, 10), locale) : '—'),
    },
    {
      key: 'status',
      headerKey: 'stylists.table.status',
      className: 'p-3',
      render: (s) => (
        <Badge variant={s.isActive ? 'success' : 'danger'} className="text-[10px]">
          {s.isActive ? t('stylists.status.active') : t('stylists.status.inactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      headerKey: 'stylists.table.actions',
      align: 'right',
      className: 'p-3',
      // Klik na akcijsku ćeliju NE okida row-click: DataTable ignoriše klikove
      // s interaktivnih potomaka ('button, a, input, …').
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button asChild type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.analytics')}>
            <RouterLink to={`/admin/analytics?tab=stylists&stylistId=${s.id}`}>
              <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
            </RouterLink>
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.edit')} onClick={() => void openEditForm(s)}>
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]


  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-content">{t('nav.stylists')}</h1>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-content-strong">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <div className="app-table-wrap">
            <DataTable
              caption={t('stylists.tableCaption')}
              columns={stylistColumns}
              rows={stylists}
              rowKey={(s) => s.id}
              onRowClick={(s) => void openEditForm(s)}
              empty={<EmptyState title={t('common.noData')} />}
            />
          </div>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-content-strong">{t('stylists.table.total', { count: total })}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((prev) => Math.max(0, prev - 1))}>
            {t('common.previous')}
          </Button>
          <p className="text-sm text-content-strong ">
            {page + 1} / {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <Button type="button" size="sm" variant="outline" disabled={page >= Math.ceil(total / pageSize) - 1} onClick={() => setPage((prev) => prev + 1)}>
            {t('common.next')}
          </Button>
        </div>
      </div>

      <StylistEditorDialog open={open} setOpen={setOpen} selectedStylist={selectedStylist} form={form} setForm={setForm}
        workingHours={workingHours} updateWH={updateWH} selectedServices={selectedServices} unselectedServices={unselectedServices}
        allServices={allServices} stylistServiceIds={stylistServiceIds} toggleService={toggleService} saving={saving} onSave={() => void handleSaveAll()} />
    </div>
  )
}
