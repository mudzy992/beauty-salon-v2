import { AlertCircle, CalendarDays, UsersRound, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { StatGrid } from '../shell/admin/ui/stat-grid'
import type { DashboardStats } from './types'

type Props = {
  stats: DashboardStats
  failedSources: string[]
}

export const DashboardOpsStats = ({ stats, failedSources }: Props) => {
  const { t, i18n } = useTranslation()
  const formatCount = (count: number) =>
    formatLocalizedNumber(count, i18n.language, { maximumFractionDigits: 0 })

  const unavailable = t('dashboard.unavailable')
  const missing = (source: string) => failedSources.includes(source)
  const hasPendingReviews = !missing('reviews') && stats.pendingReviews > 0

  return (
    <section data-dashboard-operations className="space-y-3">
      <h2 className="text-sm font-semibold text-content">{t('dashboard.operations')}</h2>
      <StatGrid
        label={t('dashboard.operations')}
        columns={4}
        items={[
          {
            label: t('dashboard.reservationsThisMonth'),
            value: missing('reservationSummary') ? unavailable : formatCount(stats.reservationsThisMonth),
            icon: <CalendarDays className="h-5 w-5" />,
            hint: missing('reservationSummary') ? undefined : t('dashboard.reservationCounts', {
              completed: formatCount(stats.completedReservations),
              pending: formatCount(stats.pendingReservations),
            }),
          },
          {
            label: t('dashboard.users'),
            value: missing('usersCount') ? unavailable : formatCount(stats.usersCount),
            icon: <UsersRound className="h-5 w-5" />,
            hint: t('dashboard.userCounts', {
              stylists: missing('stylists') ? unavailable : formatCount(stats.stylistsCount),
              services: missing('services') ? unavailable : formatCount(stats.servicesCount),
            }),
          },
          {
            label: t('dashboard.pendingReviews'),
            value: missing('reviews') ? unavailable : formatCount(stats.pendingReviews),
            /*
             * WCAG 1.4.1 + 1.4.3 — prijašnji `text-orange-600` bio je 3.56:1 (ispod
             * 4.5:1) i van brand palete, a naglasak je bio samo boja. Sada: `--warn-fg`
             * (7.49:1) + ikona + tekstualna oznaka.
             */
            tone: hasPendingReviews ? 'warn' : 'default',
            icon: hasPendingReviews ? <AlertCircle className="h-4 w-4" /> : undefined,
            hint: hasPendingReviews ? t('dashboard.pendingReviewsAttention') : undefined,
          },
          { label: t('dashboard.blogPosts'), value: missing('blogPosts') ? unavailable : formatCount(stats.blogPostsCount), icon: <FileText className="h-5 w-5" /> },
        ]}
      />
    </section>
  )
}
