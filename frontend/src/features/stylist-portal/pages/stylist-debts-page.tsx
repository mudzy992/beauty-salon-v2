import { useMemo, useState } from 'react'

import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { useAppToast } from '../../../lib/toast/useAppToast'
import api from '../../../api/client'
import { useQuery } from '@tanstack/react-query'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'

type DebtRow = {
  id: string
  amount: number | string
  createdAt: string
  note?: string | null
  client: { id: string; username: string; firstName: string | null; lastName: string | null }
  service?: { id: string; name: string } | null
  reservation?: { id: string; publicReferenceCode: string; reservationDate: string; startTime: string; endTime: string } | null
  dailyLogEntry?: { id: string; date: string; reservationId: string | null; kind: 'SERVICE' | 'DEBT_PAYMENT' } | null
  manualEntry?: { id: string; date: string } | null
}

const formatMoney = (v: number | string) => `${Number(v || 0).toFixed(2)} KM`

export const StylistDebtsPage = () => {
  const { toastApiError, success } = useAppToast()
  const [q, setQ] = useState('')
  const [repayOpen, setRepayOpen] = useState(false)
  const [repayDebtId, setRepayDebtId] = useState<string | null>(null)
  const [repayDate, setRepayDate] = useState(() => getSalonDateOnly())
  const [repayNote, setRepayNote] = useState('')
  const [repaying, setRepaying] = useState(false)

  const query = useQuery({
    queryKey: ['stylistDebts', 'me'],
    queryFn: async () => {
      const { data } = await api.get<DebtRow[]>('/api/client-debts/stylist/me')
      return Array.isArray(data) ? data : []
    },
  })

  const rows = query.data ?? []
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((d) => {
      const name = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim().toLowerCase()
      return (
        d.client.username.toLowerCase().includes(term) ||
        name.includes(term) ||
        (d.service?.name ?? '').toLowerCase().includes(term) ||
        (d.reservation?.publicReferenceCode ?? '').toLowerCase().includes(term)
      )
    })
  }, [rows, q])

  const total = filtered.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)

  const openRepay = (debtId: string) => {
    setRepayDebtId(debtId)
    setRepayDate(getSalonDateOnly())
    setRepayNote('')
    setRepayOpen(true)
  }

  const submitRepay = async () => {
    if (!repayDebtId) return
    setRepaying(true)
    try {
      await api.post(`/api/client-debts/${repayDebtId}/repay`, {
        date: repayDate,
        note: repayNote.trim() || undefined,
      })
      success('Naplaćeno', 'Dug je zatvoren i evidentiran u dnevnoj knjizi.')
      setRepayOpen(false)
      await query.refetch()
    } catch (err) {
      toastApiError(err, 'Greška pri naplati duga')
    } finally {
      setRepaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Dužnici</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">Lista dugovanja koja su evidentirana kod vas.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Ukupno</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatMoney(total)}</div>
        </div>
      </div>

      <Card className="p-4">
        <Label htmlFor="q">Pretraga</Label>
        <Input id="q" className="mt-2 max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Klijent, servis, kod rezervacije…" />
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
                      {d.service?.name ? `${d.service.name} · ` : ''}
                      {ref}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{d.createdAt.slice(0, 10)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(d.amount)}</div>
                    <Button type="button" size="sm" className="mt-2" onClick={() => openRepay(d.id)}>
                      Naplati dug
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naplata duga</DialogTitle>
            <DialogDescription>
              Otplata duga se evidentira kao posebna stavka u dnevnoj knjizi (napojnica 0) i kao ručni prihod u knjizi prihoda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="repayDate">Datum</Label>
              <Input id="repayDate" type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repayNote">Napomena (opciono)</Label>
              <Input id="repayNote" value={repayNote} onChange={(e) => setRepayNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRepayOpen(false)} disabled={repaying}>
              Odustani
            </Button>
            <Button type="button" onClick={submitRepay} disabled={repaying}>
              Potvrdi naplatu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

