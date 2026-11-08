import { useTranslation } from 'react-i18next'

import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import { StatGrid } from '../shell/admin/ui/stat-grid'
import type { DashboardStats } from './types'

type Props = {
  stats: DashboardStats
}

export const DashboardFinanceStats = ({ stats }: Props) => {
  const { t, i18n } = useTranslation()
  const formatKm = (amount: number) => formatLocalizedAmount(amount, i18n.language)
  const services = stats.servicesRevenueThisMonth
  const tips = stats.tipsThisMonth
  const total = services + tips
  const expenses = stats.expensesThisMonth
  const net = total - expenses

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-content">{t('dashboard.financeThisMonth')}</h2>
        <p className="text-xs text-content-muted">{t('dashboard.incomeSummary')}</p>
      </div>
      <StatGrid
        label={t('dashboard.financeThisMonth')}
        columns={5}
        items={[
          { label: t('dashboard.totalIncome'), value: formatKm(total), tone: 'ok' },
          { label: t('dashboard.serviceIncome'), value: formatKm(services) },
          { label: t('dashboard.tips'), value: formatKm(tips) },
          { label: t('dashboard.expenses'), value: formatKm(expenses), tone: 'bad' },
          {
            label: t('dashboard.net'),
            value: formatKm(net),
            // WCAG 1.4.1 — predznak nije samo boja: ide strelica i tekstualna oznaka.
            trend: {
              direction: net > 0 ? 'up' : net < 0 ? 'down' : 'flat',
              label: net < 0 ? t('dashboard.netNegative') : t('dashboard.netPositive'),
            },
            tone: net < 0 ? 'bad' : 'default',
          },
        ]}
      />
    </section>
  )
}
