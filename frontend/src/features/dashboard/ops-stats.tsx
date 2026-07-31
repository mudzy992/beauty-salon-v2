import { Card, CardContent } from '../../components/ui/card'
import type { DashboardStats } from './types'

type Props = {
  stats: DashboardStats
}

const Mini = ({
  title,
  value,
  hint,
  emphasize,
}: {
  title: string
  value: string | number
  hint?: string
  emphasize?: boolean
}) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          emphasize ? 'text-orange-600' : 'text-slate-900 dark:text-slate-50'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </CardContent>
  </Card>
)

export const DashboardOpsStats = ({ stats }: Props) => (
  <section className="space-y-3">
    <h2 className="text-sm font-semibold text-slate-900">Operacije</h2>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Mini
        title="Rezervacije (ovaj mjesec)"
        value={stats.reservationsThisMonth}
        hint={`${stats.completedReservations} završenih · ${stats.pendingReservations} na čekanju`}
      />
      <Mini
        title="Korisnici"
        value={stats.usersCount}
        hint={`${stats.stylistsCount} stilista · ${stats.servicesCount} servisa`}
      />
      <Mini
        title="Recenzije na čekanju"
        value={stats.pendingReviews}
        emphasize={stats.pendingReviews > 0}
      />
      <Mini title="Blog članaka" value={stats.blogPostsCount} />
    </div>
  </section>
)
