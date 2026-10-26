import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Label } from '../../../components/ui/label'
import { useAppToast } from '../../../lib/toast/useAppToast'
import api from '../../../api/client'
import { useQuery } from '@tanstack/react-query'
import { getSalonDateOnly } from '../../../../../shared/business-date.mjs'
import { formatLocalizedAmount, getIntlLocale } from '../../../i18n/locale-utils.mjs'

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

const formatMoney = (v: number | string, locale: string) => formatLocalizedAmount(Number(v || 0), locale)
const formatDateOnly = (value: string, locale: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
    : '—'
}

export const StylistDebtsPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
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
      success(t('stylistPortal.debts.repaidTitle'), t('stylistPortal.debts.repaidDescription'))
      setRepayOpen(false)
      await query.refetch()
    } catch (err) {
      toastApiError(err, t('stylistPortal.debts.repayFailed'))
    } finally {
      setRepaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('stylistPortal.debts.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.debts.description')}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{t('stylistPortal.debts.total')}</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">{formatMoney(total, locale)}</div>
        </div>
      </div>

      <Card className="p-4">
        <Label htmlFor="q">{t('stylistPortal.debts.search')}</Label>
        <Input id="q" className="mt-2 max-w-md" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('stylistPortal.debts.searchPlaceholder')} />
      </Card>

      <Card className="p-4">
        {query.isLoading ? (
          <div className="text-sm text-slate-500">{t('common.loading')}</div>
        ) : query.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-2" role="alert">
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.debts.loadFailed')}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">{rows.length === 0 ? t('stylistPortal.debts.noOpenDebts') : t('stylistPortal.debts.noSearchResults')}</div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((d) => {
              const clientName = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim() || d.client.username
              const ref =
                d.reservation?.publicReferenceCode
                  ? t('stylistPortal.debts.reservationReference', { reference: d.reservation.publicReferenceCode })
                  : d.dailyLogEntry?.id
                    ? t('stylistPortal.debts.dailyLogReference', { date: formatDateOnly(d.dailyLogEntry.date, locale) })
                    : d.manualEntry?.id
                      ? t('stylistPortal.debts.manualEntryReference', { date: formatDateOnly(d.manualEntry.date, locale) })
                      : '—'
              return (
                <div key={d.id} className="rounded-md border border-slate-200 dark:border-slate-800 p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-slate-50 truncate">{clientName}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {d.service?.name ? `${d.service.name} · ` : ''}
                      {ref}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{formatDateOnly(d.createdAt, locale)}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">{formatMoney(d.amount, locale)}</div>
                    <Button type="button" size="sm" className="mt-2" onClick={() => openRepay(d.id)}>
                      {t('stylistPortal.debts.repayDebt')}
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
            <DialogTitle>{t('stylistPortal.debts.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('stylistPortal.debts.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="repayDate">{t('common.date')}</Label>
              <Input id="repayDate" type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repayNote">{t('stylistPortal.debts.noteOptional')}</Label>
              <Input id="repayNote" value={repayNote} onChange={(e) => setRepayNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRepayOpen(false)} disabled={repaying}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={submitRepay} disabled={repaying}>
              {t('stylistPortal.debts.confirmRepayment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

