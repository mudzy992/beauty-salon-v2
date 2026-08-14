import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import api from '../api/client'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

interface StylistAnalyticsData {
  stylist: {
    id: string
    name: string
    user?: { id: string; username: string; email: string | null; firstName: string | null; lastName: string | null }
  }
  fromDate: string | null
  toDate: string | null
  completedCount: number
  revenue: number
  tips: number
  topServices: { serviceId: string; serviceName: string; count: number; revenue: number }[]
  recentEntries: { id: string; date: string; serviceName: string | null; clientName: string | null; actualPrice: unknown; tipAmount: unknown }[]
}

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
  </Card>
)

export default function StylistAnalytics() {
  const [searchParams] = useSearchParams()
  const stylistId = searchParams.get('stylistId')
  const [data, setData] = useState<StylistAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(searchParams.get('fromDate') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('toDate') ?? '')

  const load = useCallback(() => {
    if (!stylistId) return
    setLoading(true)
    const params: Record<string, string> = {}
    if (dateFrom) params.fromDate = dateFrom
    if (dateTo) params.toDate = dateTo
    api
      .get<StylistAnalyticsData>(`/api/stylists/${stylistId}/analytics`, { params })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [stylistId, dateFrom, dateTo])

  useEffect(() => {
    if (stylistId) load()
    else setData(null)
  }, [stylistId, load])

  if (!stylistId) {
    return (
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <RouterLink to="/admin/stylists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nazad na Stiliste
          </RouterLink>
        </Button>
        <p className="text-sm text-slate-500">Odaberite stilistu (npr. s liste Stilisti) da vidite analitiku.</p>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <Button asChild variant="ghost" className="mb-4">
          <RouterLink to="/admin/stylists">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Nazad na Stiliste
          </RouterLink>
        </Button>
        <p className="text-sm text-rose-600">Nije moguće učitati analitiku stiliste.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <RouterLink to="/admin/stylists">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Nazad na Stiliste
        </RouterLink>
      </Button>

      <div className="flex flex-col flex-wrap gap-3 md:flex-row md:items-end">
        <div className="w-full md:w-auto">
          <Label htmlFor="stylist-from" className="text-sm">
            Od datuma
          </Label>
          <Input id="stylist-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 md:max-w-[160px]" />
        </div>
        <div className="w-full md:w-auto">
          <Label htmlFor="stylist-to" className="text-sm">
            Do datuma
          </Label>
          <Input id="stylist-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 md:max-w-[160px]" />
        </div>
        <Button type="button" size="sm" onClick={load} disabled={loading} className="md:mb-0.5">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Učitavam...
            </>
          ) : (
            'Primijeni period'
          )}
        </Button>
        {data.fromDate || data.toDate ? (
          <p className="pb-1 text-sm text-slate-500 md:self-center">
            Period: {data.fromDate} – {data.toDate}
          </p>
        ) : null}
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{data.stylist.name}</h1>
        {data.stylist.user?.email ? <p className="text-sm text-slate-500">{data.stylist.user.email}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Završeno (u periodu)" value={String(data.completedCount)} />
        <StatCard title="Prihod (KM)" value={data.revenue.toFixed(2)} />
        <StatCard title="Napojnice (KM)" value={data.tips.toFixed(2)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Top usluge</h2>
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Usluga</th>
                  <th className="py-2 pr-3 text-right font-medium">Broj</th>
                  <th className="py-2 text-right font-medium">Prihod (KM)</th>
                </tr>
              </thead>
              <tbody>
                {data.topServices.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
                      Nema podataka.
                    </td>
                  </tr>
                ) : (
                  data.topServices.map((s) => (
                    <tr key={s.serviceId} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-3">{s.serviceName}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{s.count}</td>
                      <td className="py-2 text-right tabular-nums">{s.revenue.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Posljednji unosi</h2>
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">Datum</th>
                  <th className="py-2 pr-3 font-medium">Servis</th>
                  <th className="py-2 pr-3 font-medium">Klijent</th>
                  <th className="py-2 text-right font-medium">Iznos</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      Nema podataka.
                    </td>
                  </tr>
                ) : (
                  data.recentEntries.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-3">{e.date?.slice(0, 10)}</td>
                      <td className="py-2 pr-3">{e.serviceName ?? '-'}</td>
                      <td className="py-2 pr-3">{e.clientName ?? '-'}</td>
                      <td className="py-2 text-right tabular-nums">{Number(e.actualPrice).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
