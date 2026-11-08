import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../features/dashboard/use-dashboard-data'
import { DashboardFinanceStats } from '../features/dashboard/finance-stats'
import { DashboardOpsStats } from '../features/dashboard/ops-stats'
import { DashboardRecentReservations } from '../features/dashboard/recent-reservations'
import { DashboardOutboxDiagnostics } from '../features/dashboard/outbox-diagnostics'
import { PageHeader } from '../features/shell/admin/ui/page-header'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { stats, recentReservations, loading } = useDashboardData()
  const canViewOutboxDiagnostics = (user?.roles ?? []).some(
    (role) => role === 'SYSTEM_ADMIN' || role === 'OWNER',
  )

  if (loading || !stats) {
    // WCAG 4.1.3 — učitavanje je live regija, ne samo vizuelni tekst.
    return (
      <div role="status" aria-live="polite" className="space-y-3 p-6">
        <span className="sr-only">{t('common.loading')}</span>
        <div
          aria-hidden
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${t('dashboard.welcome')}, ${user?.username ?? ''}`}
        description={t('dashboard.stats')}
      />
      <DashboardFinanceStats stats={stats} />
      <DashboardOpsStats stats={stats} />
      {canViewOutboxDiagnostics ? <DashboardOutboxDiagnostics /> : null}
      <DashboardRecentReservations reservations={recentReservations} />
    </div>
  )
}
