import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import type { Service } from './service-types'

type ServiceTableProps = {
  rows: Service[]
  serviceAccessibleName: (service: Service) => string
  onEdit: (service: Service, opener: HTMLButtonElement) => void
  onDelete: (service: Service, opener: HTMLButtonElement) => void
}

export function ServiceTable({ rows, serviceAccessibleName, onEdit, onDelete }: ServiceTableProps) {
  const { t, i18n } = useTranslation()
  const columns: DataTableColumn<Service>[] = [
    {
      key: 'service',
      headerKey: 'services.table.service',
      className: 'p-3 font-medium',
      render: (s) => s.name,
    },
    {
      key: 'description',
      headerKey: 'services.table.description',
      className: 'p-3',
      render: (s) => (
        <span className="block min-w-0 max-w-[260px] [overflow-wrap:anywhere]">{s.shortDescription ?? '-'}</span>
      ),
    },
    {
      key: 'duration',
      headerKey: 'services.table.duration',
      align: 'right',
      className: 'p-3 tabular-nums',
      render: (s) => t('services.durationValue', { count: s.durationMinutes }),
    },
    {
      key: 'price',
      headerKey: 'services.table.price',
      align: 'right',
      className: 'p-3 tabular-nums',
      render: (s) =>
        formatLocalizedNumber(s.price, i18n.language, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: 'gender',
      headerKey: 'services.table.gender',
      className: 'p-3',
      render: (s) => (
        <Badge
          variant={s.gender === 'MALE' ? 'secondary' : 'brand'}
          className="text-[10px]"
        >
          {s.gender === 'MALE' ? t('users.gender.male') : t('users.gender.female')}
        </Badge>
      ),
    },
    {
      key: 'loyalty',
      headerKey: 'services.table.loyalty',
      className: 'p-3',
      render: (s) =>
        s.loyaltyEnabled ? (
          <Badge variant="brand" className="text-[10px]">
            {t('services.loyaltyDiscount', {
              percent: formatLocalizedNumber(s.loyaltyMaxDiscountPercent ?? 0, i18n.language),
            })}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px]">
            {t('services.withoutLoyalty')}
          </Badge>
        ),
    },
    {
      key: 'status',
      headerKey: 'services.table.status',
      className: 'p-3',
      render: (s) => (
        <Badge variant={s.isActive ? 'success' : 'secondary'} className="text-[10px]">
          {s.isActive
            ? t('services.status.serviceActive')
            : t('services.status.serviceInactive')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      headerKey: 'services.table.actions',
      align: 'right',
      className: 'p-3',
      render: (s) => (
        <div className="flex justify-end gap-1">
          <Button
            asChild
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('services.aria.workGallery', { name: serviceAccessibleName(s) })}
          >
            <RouterLink to={`/admin/services/${s.id}/work-gallery`}>
              <Eye className="h-4 w-4 text-purple-600" />
            </RouterLink>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('services.aria.editService', { name: serviceAccessibleName(s) })}
            onClick={(event) => onEdit(s, event.currentTarget)}
          >
            <Pencil className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('services.aria.deleteService', { name: serviceAccessibleName(s) })}
            onClick={(event) => onDelete(s, event.currentTarget)}
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      caption={t('services.tableCaption')}
      tableClassName="service-catalog-table"
      columns={columns}
      rows={rows}
      rowKey={(s) => s.id}
    />
  )
}
