import { Card } from '../../components/ui/card'
import type { DailyLogEntry } from './types'
import { sumEntryTotals } from './amounts'

const StatMini = ({ title, value }: { title: string; value: string }) => (
  <Card className="p-4">
    <p className="text-xs text-slate-500">{title}</p>
    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
  </Card>
)

type Props = {
  entries: DailyLogEntry[]
}

export const DailyLogStats = ({ entries }: Props) => {
  const active = entries.filter((e) => !e.deletedAt)
  const { total, services, tips } = sumEntryTotals(active)
  const completedCount = active.filter((e) => e.status === 'COMPLETED').length
  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatMini title="Ukupan prihod" value={`${total.toFixed(2)} KM`} />
      <StatMini title="Prihod od servisa" value={`${services.toFixed(2)} KM`} />
      <StatMini title="Napojnice" value={`${tips.toFixed(2)} KM`} />
      <StatMini title="Kompletirano" value={`${completedCount} / ${active.length}`} />
    </div>
  )
}
