import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import type { UserRow } from './user-types'

export function UsersList({
  loading,
  items,
  columns,
  renderCard,
}: {
  loading: boolean
  items: UserRow[]
  columns: DataTableColumn<UserRow>[]
  renderCard: (u: UserRow) => ReactNode
}) {
  const { t } = useTranslation()
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex justify-center p-10 text-content-strong">
        <span className="sr-only">{t('common.loading')}</span>
        <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="p-6 text-sm text-content-strong">{t('common.noData')}</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:hidden">{items.map((u) => renderCard(u))}</div>

      <div className="hidden app-table-wrap lg:block">
        <DataTable
          caption={t('users.caption')}
          columns={columns}
          rows={items}
          rowKey={(u) => u.id}
        />
      </div>
    </>
  )
}
