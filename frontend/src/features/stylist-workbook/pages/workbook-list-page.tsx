import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { WorkbookNewEntryDrawer } from './workbook-new-entry-page'
import { useStylistProfileMe } from '../hooks/useStylistProfileMe'
import { useWorkbookEntries } from '../hooks/useWorkbookEntries'
import { getCollectedTotal, getServicesLabel, getSettledDebtsSum } from '../workbook-display'
import {
  addDateOnlyDays,
  addDateOnlyMonths,
  getSalonDateOnly,
} from '../../../../../shared/business-date.mjs'

const formatKm = (v: number) => `${Number(v || 0).toFixed(2)} KM`

const getWindow = () => {
  const today = getSalonDateOnly()
  return {
    fromDate: addDateOnlyMonths(today, -1),
    toDate: addDateOnlyDays(today, 7),
  }
}

export const WorkbookListPage = () => {
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const { fromDate, toDate } = useMemo(() => getWindow(), [])
  const [newOpen, setNewOpen] = useState(false)

  const { sections, isLoading, isFetching, refetch } = useWorkbookEntries({
    stylistProfileId: profileId,
    fromDate,
    toDate,
  })

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Učitavanje…</div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Nema profila</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Profil stilista nije pronađen.</p>
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dnevna knjiga</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Period: {fromDate} → {toDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Osvježavam…' : 'Osvježi'}
          </Button>
          <Button type="button" className="gap-2" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" />
            Novi unos
          </Button>
        </div>
      </div>

      <WorkbookNewEntryDrawer open={newOpen} onOpenChange={setNewOpen} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-slate-500">Učitavanje…</div>
        </div>
      ) : sections.length === 0 ? (
        <Card className="p-6">
          <p className="text-slate-900 dark:text-slate-50 font-semibold">Nema zapisa</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Zapisi iz rezervacija ili ručno dodani pojavit će se ovdje. Završite zapis i dodajte before/after slike.
          </p>
          <div className="mt-4">
            <Button type="button" className="gap-2" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              Novi unos
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="mb-2 text-sm font-semibold text-brand-gold">{section.title}</div>
              <div className="grid grid-cols-1 gap-3">
                {section.data.map((item) => {
                  const beforeCount = item.images?.filter((i) => i.isBefore).length ?? 0
                  const afterCount = item.images?.filter((i) => i.isAfter).length ?? 0
                  const hasBA = beforeCount > 0 && afterCount > 0
                  const clientName = item.client
                    ? [item.client.firstName, item.client.lastName].filter(Boolean).join(' ') ||
                      item.client.user?.username ||
                      ''
                    : ''
                  return (
                    <Link key={item.id} to={`/stylist/workbook/${item.id}`} className="block">
                      <Card className="p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-base font-semibold text-slate-900 dark:text-slate-50 truncate">
                              {item.publicReferenceCode ?? getServicesLabel(item)}
                            </div>
                            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                              {item.date?.slice(0, 10)} · {getServicesLabel(item)}
                            </div>
                            {clientName ? (
                              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">
                                {clientName}
                              </div>
                            ) : null}
                            <div className="mt-2 text-sm font-semibold text-brand-gold">
                              {formatKm(getCollectedTotal(item))}
                              {getSettledDebtsSum(item) > 0
                                ? ` · dug ${formatKm(getSettledDebtsSum(item))}`
                                : ''}
                              {Number(item.tipAmount) > 0
                                ? ` · nap. ${formatKm(Number(item.tipAmount))}`
                                : ''}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {hasBA ? <Badge variant="brand">B/A</Badge> : null}
                            <Badge variant={item.status === 'COMPLETED' ? 'success' : 'warning'}>
                              {item.status === 'COMPLETED' ? 'Završeno' : 'Na čekanju'}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

