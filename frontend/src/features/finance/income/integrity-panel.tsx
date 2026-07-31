import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { formatIsoDateBs, formatMoney, getPersonName } from '../finance.utils'
import type { IncomeBookIntegrity } from '../finance.types'

type IntegrityPanelProps = {
  report: IncomeBookIntegrity | undefined
  isLoading: boolean
  isResyncing: boolean
  onResync: () => void
}

/** Prikazuje razilaženje dnevnika i KIF-a koje bi inače ostalo nevidljivo. */
export function IntegrityPanel({
  report,
  isLoading,
  isResyncing,
  onResync,
}: IntegrityPanelProps) {
  if (isLoading || !report) {
    return (
      <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
    )
  }

  if (report.isHealthy) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <span className="text-emerald-800 dark:text-emerald-200">
          Knjiga je usklađena sa dnevnikom rada.
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-2">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Knjiga nije usklađena sa dnevnikom
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Neknjiženih zapisa: {report.missingCount} · Zastarjelih stavki:{' '}
              {report.orphanedCount}
            </p>
          </div>
        </div>
        {report.missingCount > 0 && !report.isLocked ? (
          <Button size="sm" onClick={onResync} disabled={isResyncing}>
            <RefreshCw
              className={`mr-2 h-3.5 w-3.5 ${isResyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            Sinhronizuj
          </Button>
        ) : null}
      </div>

      {report.missing.length > 0 ? (
        <ul className="mt-3 grid gap-1 text-xs text-amber-900 dark:text-amber-200">
          {report.missing.slice(0, 5).map((entry) => (
            <li key={entry.id} className="flex justify-between gap-3">
              <span className="truncate">
                {formatIsoDateBs(entry.date)} · {entry.service?.name ?? '—'} ·{' '}
                {getPersonName(entry.stylistProfile?.user)}
              </span>
              <span className="shrink-0 tabular-nums">
                {formatMoney(entry.actualPrice)}
              </span>
            </li>
          ))}
          {report.missing.length > 5 ? (
            <li className="text-amber-700 dark:text-amber-400">
              …i još {report.missing.length - 5} zapisa
            </li>
          ) : null}
        </ul>
      ) : null}

      {report.isLocked ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          Otključajte knjigu da biste je mogli sinhronizovati.
        </p>
      ) : null}
    </div>
  )
}
