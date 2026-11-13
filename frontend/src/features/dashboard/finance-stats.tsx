import { useTranslation } from 'react-i18next'
import { Wallet, Scissors, HandCoins, Receipt, Scale } from 'lucide-react'

import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import { StatGrid } from '../shell/admin/ui/stat-grid'
import type { DashboardStats } from './types'

type Props = {
  stats: DashboardStats
  failedSources: string[]
}

export const DashboardFinanceStats = ({ stats, failedSources }: Props) => {
  const { t, i18n } = useTranslation()
  const formatKm = (amount: number) => formatLocalizedAmount(amount, i18n.language)
  const services = stats.servicesRevenueThisMonth
  const tips = stats.tipsThisMonth
  const total = services + tips
  const expenses = stats.expensesThisMonth
  const net = total - expenses
  const incomeAvailable = !failedSources.includes('incomeBook')
  const expenseAvailable = !failedSources.includes('expenseBook')
  const unavailable = t('dashboard.unavailable')

  return (
    <section data-dashboard-finance className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-content">{t('dashboard.financeThisMonth')}</h2>
        <p className="text-xs text-content-muted">{t('dashboard.incomeSummary')}</p>
      </div>
      <StatGrid
        label={t('dashboard.financeThisMonth')}
        columns={5}
        items={[
          { label: t('dashboard.totalIncome'), value: incomeAvailable ? formatKm(total) : unavailable, tone: 'ok', icon: <Wallet className="h-5 w-5" /> },
          { label: t('dashboard.serviceIncome'), value: incomeAvailable ? formatKm(services) : unavailable, icon: <Scissors className="h-5 w-5" /> },
          { label: t('dashboard.tips'), value: incomeAvailable ? formatKm(tips) : unavailable, icon: <HandCoins className="h-5 w-5" /> },
          { label: t('dashboard.expenses'), value: expenseAvailable ? formatKm(expenses) : unavailable, tone: 'bad', icon: <Receipt className="h-5 w-5" /> },
          {
            label: t('dashboard.net'),
            value: incomeAvailable && expenseAvailable ? formatKm(net) : unavailable,
            icon: <Scale className="h-5 w-5" />,
            // WCAG 1.4.1 — predznak nije samo boja: ide strelica i tekstualna oznaka.
            trend: incomeAvailable && expenseAvailable ? {
              direction: net > 0 ? 'up' : net < 0 ? 'down' : 'flat',
              label: net < 0 ? t('dashboard.netNegative') : t('dashboard.netPositive'),
            } : undefined,
            tone: incomeAvailable && expenseAvailable && net < 0 ? 'bad' : 'default',
          },
        ]}
      />
    </section>
  )
}
