import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../features/dashboard/use-dashboard-data'
import { DashboardFinanceStats } from '../features/dashboard/finance-stats'
import { DashboardOpsStats } from '../features/dashboard/ops-stats'
import { DashboardRecentReservations } from '../features/dashboard/recent-reservations'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { stats, recentReservations, loading } = useDashboardData()

  if (loading || !stats) {
    return (
      <div className="p-6 text-center">
        <div className="text-sm text-slate-600">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {t('dashboard.welcome')}, {user?.username}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t('dashboard.stats')}</p>
      </div>
      <DashboardFinanceStats stats={stats} />
      <DashboardOpsStats stats={stats} />
      <DashboardRecentReservations reservations={recentReservations} />
    </div>
  )
}
