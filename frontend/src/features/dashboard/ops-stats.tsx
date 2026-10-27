import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '../../components/ui/card'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { DashboardStats } from './types'

type Props = {
  stats: DashboardStats
}

const Mini = ({
  title,
  value,
  hint,
  emphasize,
}: {
  title: string
  value: string | number
  hint?: string
  emphasize?: boolean
}) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          emphasize ? 'text-orange-600' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </CardContent>
  </Card>
)

export const DashboardOpsStats = ({ stats }: Props) => {
  const { t, i18n } = useTranslation()
  const formatCount = (count: number) =>
    formatLocalizedNumber(count, i18n.language, { maximumFractionDigits: 0 })

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">{t('dashboard.operations')}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Mini
          title={t('dashboard.reservationsThisMonth')}
          value={formatCount(stats.reservationsThisMonth)}
          hint={t('dashboard.reservationCounts', {
            completed: formatCount(stats.completedReservations),
            pending: formatCount(stats.pendingReservations),
          })}
        />
        <Mini
          title={t('dashboard.users')}
          value={formatCount(stats.usersCount)}
          hint={t('dashboard.userCounts', {
            stylists: formatCount(stats.stylistsCount),
            services: formatCount(stats.servicesCount),
          })}
        />
        <Mini
          title={t('dashboard.pendingReviews')}
          value={formatCount(stats.pendingReviews)}
          emphasize={stats.pendingReviews > 0}
        />
        <Mini title={t('dashboard.blogPosts')} value={formatCount(stats.blogPostsCount)} />
      </div>
    </section>
  )
}
