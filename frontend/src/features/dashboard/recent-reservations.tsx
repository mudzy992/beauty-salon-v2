import { Link } from 'react-router-dom'
import { Card, CardContent } from '../../components/ui/card'
import type { RecentReservation } from './types'
import { statusClassMap } from './types'

type Props = {
  reservations: RecentReservation[]
}

export const DashboardRecentReservations = ({ reservations }: Props) => (
  <Card>
    <CardContent className="p-5">
      <div className="mb-3 text-sm font-semibold text-slate-900">Posljednje rezervacije</div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-medium">Datum</th>
              <th className="py-2 pr-3 font-medium">Vrijeme</th>
              <th className="py-2 pr-3 font-medium">Klijent</th>
              <th className="py-2 pr-3 font-medium">Servis</th>
              <th className="py-2 pr-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-500">
                  Nema rezervacija.
                </td>
              </tr>
            ) : (
              reservations.map((r) => {
                const clientName = r.client
                  ? [r.client.firstName, r.client.lastName].filter(Boolean).join(' ') ||
                    r.client.username ||
                    `#${r.client.id.slice(0, 8)}`
                  : '-'
                const statusClass =
                  statusClassMap[r.status] ?? 'bg-slate-100 text-slate-800 border-slate-200'
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="whitespace-nowrap py-2 pr-3">
                      {String(r.reservationDate).slice(0, 10)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3">{r.startTime}</td>
                    <td className="py-2 pr-3">
                      {r.client ? (
                        <Link
                          to={`/admin/client-analytics?userId=${r.client.id}`}
                          className="text-brand-gold hover:underline"
                        >
                          {clientName}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.service?.name ?? '-'}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)
