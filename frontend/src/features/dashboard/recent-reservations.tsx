import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '../../components/ui/card'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import type { RecentReservation } from './types'
import { statusClassMap } from './types'
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

export const DashboardRecentReservations = ({ reservations }: Props) => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 text-sm font-semibold text-slate-900">
          {t('dashboard.recentReservations')}
        </div>
        <div className="overflow-auto">
          <table className="app-table w-full">
            <thead className="text-left text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-3 font-medium">{t('common.date')}</th>
                <th className="py-2 pr-3 font-medium">{t('common.time')}</th>
                <th className="py-2 pr-3 font-medium">{t('reservations.client')}</th>
                <th className="py-2 pr-3 font-medium">{t('reservations.service')}</th>
                <th className="py-2 pr-3 font-medium">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">
                    {t('dashboard.noReservations')}
                  </td>
                </tr>
              ) : (
                reservations.map((r) => {
                  const clientName = r.client
                    ? [r.client.firstName, r.client.lastName].filter(Boolean).join(' ') ||
                      r.client.username ||
                      `#${r.client.id.slice(0, 8)}`
                    : '-'
                  const statusClass =
                    statusClassMap[r.status] ?? 'bg-slate-100 text-slate-800 border-slate-200'
                  return (
                    <tr key={r.id} className="border-b border-slate-100">
                      <td className="whitespace-nowrap py-2 pr-3">
                        {formatReservationDate(r.reservationDate, locale)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">{r.startTime}</td>
                      <td className="py-2 pr-3">
                        {r.client ? (
                          <Link
                            to={`/admin/client-analytics?userId=${r.client.id}`}
                            className="text-brand-gold-text hover:underline"
                          >
                            {clientName}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 pr-3">{r.service?.name ?? '-'}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                        >
                          {t(`reservations.statuses.${r.status}`, { defaultValue: r.status })}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
