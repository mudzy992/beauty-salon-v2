import { useTranslation } from 'react-i18next'

import {
  formatLocalizedAmount,
  formatLocalizedNumber,
} from '../../i18n/locale-utils.mjs'
import { Card } from '../../components/ui/card'
import type { DailyLogEntry } from './types'
import { sumEntryTotals } from './amounts'

const StatMini = ({ title, value }: { title: string; value: string }) => (
  <Card className="p-4">
    <p className="text-xs text-slate-500">{title}</p>
    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
      {value}
    </p>
  </Card>
)

type Props = {
  entries: DailyLogEntry[]
}

export const DailyLogStats = ({ entries }: Props) => {
  const { t, i18n } = useTranslation()
  const active = entries.filter((e) => !e.deletedAt)
  const { total, services, tips } = sumEntryTotals(active)
  const completedCount = active.filter((e) => e.status === 'COMPLETED').length
  const completedLabel = `${formatLocalizedNumber(completedCount, i18n.language)} / ${formatLocalizedNumber(active.length, i18n.language)}`
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatMini
        title={t('dailyLog.totalRevenue')}
        value={formatLocalizedAmount(total, i18n.language)}
      />
      <StatMini
        title={t('dailyLog.list.serviceRevenue')}
        value={formatLocalizedAmount(services, i18n.language)}
      />
      <StatMini
        title={t('dailyLog.totalTips')}
        value={formatLocalizedAmount(tips, i18n.language)}
      />
      <StatMini title={t('dailyLog.list.completed')} value={completedLabel} />
    </div>
  )
}
