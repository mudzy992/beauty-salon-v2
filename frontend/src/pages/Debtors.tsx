import { useMemo, useState } from 'react'
import api from '../api/client'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

type DebtRow = {
  id: string
  amount: number | string
  createdAt: string
  status: 'OPEN' | 'SETTLED'
  client: { id: string; username: string; firstName: string | null; lastName: string | null }
  stylistProfile?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } }
  service?: { id: string; name: string } | null
  reservation?: { id: string; publicReferenceCode: string; reservationDate: string; startTime: string; endTime: string } | null
  dailyLogEntry?: { id: string; date: string; reservationId: string | null; kind: 'SERVICE' | 'DEBT_PAYMENT' } | null
  manualEntry?: { id: string; date: string } | null
}

const formatMoney = (v: number | string) => `${Number(v || 0).toFixed(2)} KM`

type Props = {
  /** When rendered inside Finance tabs, hide page title. */
  embedded?: boolean
}

export default function Debtors({ embedded = false }: Props) {
  const [q, setQ] = useState('')
  const query = useQuery({
    queryKey: ['debts', 'all', 'OPEN'],
    queryFn: async () => {
      const { data } = await api.get<DebtRow[]>('/api/client-debts/all', { params: { status: 'OPEN' } })
      return Array.isArray(data) ? data : []
    },
  })

  const rows = query.data ?? []
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((d) => {
      const clientName = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim().toLowerCase()
      const stylistName = d.stylistProfile?.user
        ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim().toLowerCase()
        : ''
      return (
        d.client.username.toLowerCase().includes(term) ||
        clientName.includes(term) ||
        stylistName.includes(term) ||
        (d.service?.name ?? '').toLowerCase().includes(term) ||
        (d.reservation?.publicReferenceCode ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, q])

  const total = filtered.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {embedded ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">Sva otvorena dugovanja u sistemu.</p>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Dužnici</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Sva otvorena dugovanja u sistemu.</p>
            </>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Ukupno</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatMoney(total)}</div>
        </div>
      </div>

      <Card className="p-4">
        <Label htmlFor="q">Pretraga</Label>
        <Input id="q" className="mt-2 max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Klijent, stilist, servis, kod…" />
      </Card>

      <Card className="p-4">
        {query.isLoading ? (
          <div className="text-sm text-slate-500">Učitavanje…</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">Nema otvorenih dugovanja.</div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((d) => {
              const clientName = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim() || d.client.username
              const stylistName = d.stylistProfile?.user
                ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || d.stylistProfile.user.username
                : '—'
              const ref =
                d.reservation?.publicReferenceCode
                  ? `Rezervacija: ${d.reservation.publicReferenceCode}`
                  : d.dailyLogEntry?.id
                    ? `Daily log: ${d.dailyLogEntry.date.slice(0, 10)}`
                    : d.manualEntry?.id
                      ? `Manual entry: ${d.manualEntry.date.slice(0, 10)}`
                      : '—'
              return (
                <div key={d.id} className="rounded-md border border-slate-200 dark:border-slate-800 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">{clientName}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      <span className="font-semibold">Stilist:</span> {stylistName}
                      {d.service?.name ? ` · ${d.service.name}` : ''}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{ref} · {d.createdAt.slice(0, 10)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(d.amount)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

