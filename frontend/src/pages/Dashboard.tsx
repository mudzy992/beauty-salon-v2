import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarDays, BookOpen, BarChart3, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  DASHBOARD_SOURCE_COUNT,
  useDashboardData,
} from '../features/dashboard/use-dashboard-data'
import { Button } from '../components/ui/button'
import { DashboardFinanceStats } from '../features/dashboard/finance-stats'
import { DashboardOpsStats } from '../features/dashboard/ops-stats'
import { DashboardRecentReservations } from '../features/dashboard/recent-reservations'
import { DashboardOutboxDiagnostics } from '../features/dashboard/outbox-diagnostics'
import { PageHeader } from '../features/shell/aurum/ui/page-header'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { stats, recentReservations, loading, failedSources, loadError, reload } =
    useDashboardData()
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
            <div key={index} className="h-24 animate-pulse motion-reduce:animate-none rounded-lg bg-surface-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (loadError) {
    // D9: svih 8 izvora je palo. Bez ove grane renderuju se nule koje
    // izgledaju kao stvarni podaci (plan 04_phase-1-dashboard.md:74 je tvrdio
    // bijeli ekran - netacno, .catch() na svakom pozivu sprijecava reject).
    return (
      <div role="alert" className="space-y-4 p-6">
        <p className="text-base font-semibold text-content">{t('dashboard.loadError')}</p>
        <Button type="button" variant="outline" onClick={() => reload()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div data-admin-dashboard className="space-y-8">
      <PageHeader
        title={`${t('dashboard.welcome')}, ${user?.username ?? ''}`}
        description={t('dashboard.stats')}
      />
      {failedSources.length > 0 ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-warn p-3"
        >
          <p className="text-sm text-warn-foreground">
            {t('dashboard.partialLoadError', {
              count: failedSources.length,
              total: DASHBOARD_SOURCE_COUNT,
            })}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => reload()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : null}
      <nav data-dashboard-shortcuts aria-label={t('dashboard.quickActions')}>
        <p className="text-sm font-semibold text-content">{t('dashboard.quickActions')}</p>
        <div className="dashboard-shortcut-grid">
          <Link to="/admin/reservations"><CalendarDays aria-hidden="true" /> <span>{t('nav.reservations')}</span><ArrowRight aria-hidden="true" /></Link>
          <Link to="/admin/daily-log"><BookOpen aria-hidden="true" /> <span>{t('nav.dailyLog')}</span><ArrowRight aria-hidden="true" /></Link>
          <Link to="/admin/analytics"><BarChart3 aria-hidden="true" /> <span>{t('nav.analytics')}</span><ArrowRight aria-hidden="true" /></Link>
        </div>
      </nav>
      <DashboardFinanceStats stats={stats} failedSources={failedSources} />
      <DashboardOpsStats stats={stats} failedSources={failedSources} />
      {failedSources.includes('reservationSummary') ? (
        <section data-dashboard-recent role="status" className="rounded-lg border border-line bg-surface p-5 text-content">
          <h2 className="text-sm font-semibold">{t('dashboard.recentReservations')}</h2>
          <p className="mt-3 text-sm">{t('dashboard.unavailable')}</p>
        </section>
      ) : <DashboardRecentReservations reservations={recentReservations} />}
      {canViewOutboxDiagnostics ? <DashboardOutboxDiagnostics /> : null}
    </div>
  )
}
