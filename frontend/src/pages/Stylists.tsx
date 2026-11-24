import { useRef } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Loader2, Pencil } from 'lucide-react'

import { getIntlLocale } from '../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

import { DataTable, type DataTableColumn } from '../features/shell/admin/ui/data-table'
import { EmptyState, ErrorState } from '../features/shell/admin/ui/data-state'
import { StylistEditorDialog } from '../features/salon/stylist-editor-dialog'
import { StylistPagination } from '../features/salon/stylist-pagination'
import type { StylistProfile } from '../features/salon/stylist-types'
import { useStylistManagement } from '../features/salon/use-stylist-management'

export default function Stylists() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const { stylists, loading, loadError, loadData, saving, page, setPage, pageSize, total, open, setOpen, selectedStylist, editorState, editorErrorKey, retryEditor, allServices, form, setForm, workingHours, stylistServiceIds, openEditForm, handleSaveAll, updateWH, toggleService, selectedServices, unselectedServices } = useStylistManagement()
  const triggerRef = useRef<HTMLElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const openEditor = (stylist: StylistProfile) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    void openEditForm(stylist)
  }
  const returnFocus = (event: Event) => {
    event.preventDefault()
    const target = triggerRef.current?.isConnected ? triggerRef.current : headingRef.current
    target?.focus()
    triggerRef.current = null
  }

  const baseStylistName = (s: StylistProfile) => s.user?.username?.trim() || s.userId
  const stylistAccessibleName = (s: StylistProfile) => {
    const name = baseStylistName(s)
    const matches = stylists.filter(candidate => baseStylistName(candidate) === name)
    return matches.length > 1 ? `${name} (${matches.findIndex(candidate => candidate.id === s.id) + 1})` : name
  }

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
          <Button asChild type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.analytics', { name: stylistAccessibleName(s) })}>
            <RouterLink to={`/admin/analytics?tab=stylists&stylistId=${s.id}`}>
              <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
            </RouterLink>
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('stylists.aria.edit', { name: stylistAccessibleName(s) })} onClick={() => openEditor(s)}>
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-content">{t('nav.stylists')}</h1>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div role="status" className="flex justify-center p-10 text-content-strong">
            <span className="sr-only">{t('common.loading')}</span>
            <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          </div>
        ) : loadError ? (
          <ErrorState description={t('stylists.errors.loadFailed')} onRetry={() => { headingRef.current?.focus(); loadData() }} />
        ) : (
          <div className="app-table-wrap">
            <DataTable
              caption={t('stylists.tableCaption')}
              columns={stylistColumns}
              rows={stylists}
              rowKey={(s) => s.id}
              onRowClick={openEditor}
              empty={<EmptyState title={t('common.noData')} />}
            />
          </div>
        )}
      </Card>

      {!loading && !loadError ? <StylistPagination page={page} pageSize={pageSize} total={total} setPage={setPage} headingRef={headingRef} /> : null}

      <StylistEditorDialog open={open} setOpen={setOpen} selectedStylist={selectedStylist} editorState={editorState} editorErrorKey={editorErrorKey} retryEditor={retryEditor} onCloseAutoFocus={returnFocus} form={form} setForm={setForm}
        workingHours={workingHours} updateWH={updateWH} selectedServices={selectedServices} unselectedServices={unselectedServices}
        allServices={allServices} stylistServiceIds={stylistServiceIds} toggleService={toggleService} saving={saving} onSave={() => void handleSaveAll()} />
    </div>
  )
}
