import { Card, CardContent } from '../../components/ui/card'
import type { DashboardStats } from './types'

const formatKm = (n: number) => `${n.toFixed(2)} KM`

type Props = {
  stats: DashboardStats
}

export const DashboardFinanceStats = ({ stats }: Props) => {
  const services = stats.servicesRevenueThisMonth
  const tips = stats.tipsThisMonth
  const total = services + tips
  const expenses = stats.expensesThisMonth
  const net = total - expenses

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Finansije · ovaj mjesec</h2>
        <p className="text-xs text-slate-500">
          Ukupan prihod = od servisa + napojnice. Neto = ukupan prihod − rashodi.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-800 dark:text-emerald-300">Ukupan prihod</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-800 dark:text-emerald-200">
              {formatKm(total)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Od servisa</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
              {formatKm(services)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Napojnice</p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
              {formatKm(tips)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-rose-700 dark:text-rose-300">Rashodi</p>
            <p className="mt-1 text-xl font-semibold text-rose-700 dark:text-rose-300">
              {formatKm(expenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Neto</p>
            <p
              className={`mt-1 text-xl font-semibold ${
                net >= 0
                  ? 'text-slate-900 dark:text-slate-50'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {formatKm(net)}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
