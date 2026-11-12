import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import { EmptyState } from '../shell/admin/ui/data-state'
import { resolveReservationStatus, StatusBadge } from '../shell/admin/ui/status-badge'
import type { RecentReservation } from './types'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'

type Props = {
  reservations: RecentReservation[]
}

const formatReservationDate = (value: string, locale: string) => {
  const dateOnly = String(value).slice(0, 10)
  try {
    return formatDateOnlyLocale(dateOnly, locale, { dateStyle: 'medium' })
  } catch {
    return dateOnly
  }
}

const clientDisplayName = (reservation: RecentReservation) => {
  const client = reservation.client
  if (!client) return '-'
  return (
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    client.username ||
    `#${client.id.slice(0, 8)}`
  )
}

export const DashboardRecentReservations = ({ reservations }: Props) => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)

  const columns: DataTableColumn<RecentReservation>[] = [
    {
      key: 'date',
      headerKey: 'common.date',
      className: 'whitespace-nowrap',
      render: (r) => (
        // WCAG 1.3.1 — datum je strojno čitljiv, ne samo vizuelno formatiran.
        <time dateTime={String(r.reservationDate).slice(0, 10)}>
          {formatReservationDate(r.reservationDate, locale)}
        </time>
      ),
    },
    {
      key: 'time',
      headerKey: 'common.time',
      className: 'whitespace-nowrap',
      render: (r) => r.startTime,
    },
    {
      key: 'client',
      headerKey: 'reservations.client',
      render: (r) =>
        r.client ? (
          <Link
            to={`/admin/analytics?tab=clients&userId=${r.client.id}`}
            // WCAG 1.4.1 — link se ne oslanja samo na boju: uvijek je podvučen.
            className="text-brand-gold-text underline hover:no-underline"
          >
            {clientDisplayName(r)}
          </Link>
        ) : (
          '-'
        ),
    },
    {
      key: 'service',
      headerKey: 'reservations.service',
      render: (r) => r.service?.name ?? '-',
    },
    {
      key: 'status',
      headerKey: 'common.status',
      render: (r) => (
        <StatusBadge
          status={resolveReservationStatus(r.status)}
          label={t(`reservations.statuses.${r.status}`, { defaultValue: r.status })}
        />
      ),
    },
  ]

  return (
    <section data-dashboard-recent className="rounded-lg border border-line bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold text-content">
        {t('dashboard.recentReservations')}
      </h2>
      <DataTable
        caption={t('dashboard.recentReservations')}
        columns={columns}
        rows={reservations}
        rowKey={(r) => r.id}
        empty={<EmptyState title={t('dashboard.noReservations')} />}
      />
    </section>
  )
}
