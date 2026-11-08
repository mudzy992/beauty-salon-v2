import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { StatGrid } from '../shell/admin/ui/stat-grid'
import type { DashboardStats } from './types'

type Props = {
  stats: DashboardStats
}

export const DashboardOpsStats = ({ stats }: Props) => {
  const { t, i18n } = useTranslation()
  const formatCount = (count: number) =>
    formatLocalizedNumber(count, i18n.language, { maximumFractionDigits: 0 })

  const hasPendingReviews = stats.pendingReviews > 0

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-content">{t('dashboard.operations')}</h2>
      <StatGrid
        label={t('dashboard.operations')}
        columns={4}
        items={[
          {
            label: t('dashboard.reservationsThisMonth'),
            value: formatCount(stats.reservationsThisMonth),
            hint: t('dashboard.reservationCounts', {
              completed: formatCount(stats.completedReservations),
              pending: formatCount(stats.pendingReservations),
            }),
          },
          {
            label: t('dashboard.users'),
            value: formatCount(stats.usersCount),
            hint: t('dashboard.userCounts', {
              stylists: formatCount(stats.stylistsCount),
              services: formatCount(stats.servicesCount),
            }),
          },
          {
            label: t('dashboard.pendingReviews'),
            value: formatCount(stats.pendingReviews),
            /*
             * WCAG 1.4.1 + 1.4.3 — prijašnji `text-orange-600` bio je 3.56:1 (ispod
             * 4.5:1) i van brand palete, a naglasak je bio samo boja. Sada: `--warn-fg`
             * (7.49:1) + ikona + tekstualna oznaka.
             */
            tone: hasPendingReviews ? 'warn' : 'default',
            icon: hasPendingReviews ? <AlertCircle className="h-4 w-4" /> : undefined,
            hint: hasPendingReviews ? t('dashboard.pendingReviewsAttention') : undefined,
          },
          { label: t('dashboard.blogPosts'), value: formatCount(stats.blogPostsCount) },
        ]}
      />
    </section>
  )
}
