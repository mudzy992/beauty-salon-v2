import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'

import api from '../api/client'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { formatLocalizedAmount, getIntlLocale } from '../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'

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

type Props = {
  /** When rendered inside Finance tabs, hide page title. */
  embedded?: boolean
}

export default function Debtors({ embedded = false }: Props) {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const formatDate = (value: string) => {
    const dateOnly = String(value).slice(0, 10)
    try {
      return formatDateOnlyLocale(dateOnly, locale, { dateStyle: 'medium' })
    } catch {
      return dateOnly
    }
  }
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
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('debtors.description')}</p>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {t('debtors.title')}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">{t('debtors.description')}</p>
            </>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">{t('common.total')}</div>
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {formatLocalizedAmount(total, i18n.language)}
          </div>
        </div>
      </div>

      <Card className="p-4">
        <Label htmlFor="q">{t('common.search')}</Label>
        <Input
          id="q"
          className="mt-2 max-w-md"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('debtors.searchPlaceholder')}
        />
      </Card>

      <Card className="p-4">
        {query.isLoading ? (
          <div className="text-sm text-slate-500">{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-slate-500">{t('debtors.noOpenDebts')}</div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((d) => {
              const clientName = `${d.client.firstName ?? ''} ${d.client.lastName ?? ''}`.trim() || d.client.username
              const stylistName = d.stylistProfile?.user
                ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || d.stylistProfile.user.username
                : '—'
              const reference = d.reservation?.publicReferenceCode
                ? t('debtors.reservationReference', { reference: d.reservation.publicReferenceCode })
                : d.dailyLogEntry?.id
                  ? t('debtors.dailyLogReference', { date: formatDate(d.dailyLogEntry.date) })
                  : d.manualEntry?.id
                    ? t('debtors.manualEntryReference', { date: formatDate(d.manualEntry.date) })
                    : '—'
              return (
                <div
                  key={d.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-slate-50">
                      {clientName}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-semibold">{t('debtors.stylist')}:</span> {stylistName}
                      {d.service?.name ? ` · ${d.service.name}` : ''}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {reference} · {formatDate(d.createdAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                      {formatLocalizedAmount(Number(d.amount), i18n.language)}
                    </div>
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
