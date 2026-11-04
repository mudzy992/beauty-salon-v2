import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Card, CardContent } from '../../components/ui/card'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'

type OutboxStatus = 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'DEAD_LETTER'

type OutboxDiagnosticEvent = {
  id: string
  status: string
  attempts: number
  nextAttemptAt: string
  lockedAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

type OutboxDiagnostics = {
  generatedAt: string
  counts: Record<string, number>
  duePending: number
  staleProcessing: number
  recentEvents: OutboxDiagnosticEvent[]
}

const statuses: OutboxStatus[] = ['PENDING', 'PROCESSING', 'DELIVERED', 'DEAD_LETTER']
const statusClasses: Record<OutboxStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  PROCESSING: 'border-blue-200 bg-blue-50 text-blue-800',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DEAD_LETTER: 'border-rose-200 bg-rose-50 text-rose-800',
}

export const DashboardOutboxDiagnostics = () => {
  const { t, i18n } = useTranslation()
  const [diagnostics, setDiagnostics] = useState<OutboxDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [replayTarget, setReplayTarget] = useState<OutboxDiagnosticEvent | null>(null)
  const [replayAcknowledged, setReplayAcknowledged] = useState(false)
  const [replayLoading, setReplayLoading] = useState(false)
  const [replayFailed, setReplayFailed] = useState(false)
  const [replaySucceeded, setReplaySucceeded] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setFailed(false)
    api
      .get<OutboxDiagnostics>('/api/reservations/ops/outbox', { signal: controller.signal })
      .then(({ data }) => {
        if (
          !data ||
          typeof data !== 'object' ||
          !data.counts ||
          !Array.isArray(data.recentEvents)
        ) {
          throw new Error()
        }
        setDiagnostics(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [refreshKey])

  const submitReplay = async () => {
    if (!replayTarget || !replayAcknowledged || replayLoading) return
    setReplayLoading(true)
    setReplayFailed(false)
    setReplaySucceeded(false)
    try {
      await api.post(
        `/api/reservations/ops/outbox/${encodeURIComponent(replayTarget.id)}/replay`,
        { confirmAtLeastOnce: true },
      )
      setReplayTarget(null)
      setReplayAcknowledged(false)
      setReplaySucceeded(true)
      setRefreshKey((key) => key + 1)
    } catch {
      setReplayFailed(true)
    } finally {
      setReplayLoading(false)
    }
  }

  const number = (value: unknown) =>
    formatLocalizedNumber(
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0,
      i18n.language,
      { maximumFractionDigits: 0 },
    )

  const events = (diagnostics?.recentEvents ?? []).slice(0, 10)

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {t('dashboard.outbox.title')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('dashboard.outbox.description')}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setRefreshKey((key) => key + 1)}
          >
            {loading ? t('dashboard.outbox.refreshing') : t('dashboard.outbox.refresh')}
          </Button>
        </div>

        {failed ? (
          <Alert variant="destructive">
            <AlertDescription>{t('dashboard.outbox.loadFailed')}</AlertDescription>
          </Alert>
        ) : null}
        {replaySucceeded ? (
          <Alert variant="success">
            <AlertDescription>{t('dashboard.outbox.replayQueued')}</AlertDescription>
          </Alert>
        ) : null}
        {replayFailed ? (
          <Alert variant="destructive">
            <AlertDescription>{t('dashboard.outbox.replayFailed')}</AlertDescription>
          </Alert>
        ) : null}

        {loading && !diagnostics ? (
          <p role="status" className="text-sm text-slate-500">
            {t('common.loading')}
          </p>
        ) : null}

        {diagnostics ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statuses.map((status) => (
                <div
                  key={status}
                  className="rounded-md border border-slate-200 p-3 dark:border-slate-800"
                >
                  <p className="text-xs text-slate-500">
                    {t(`dashboard.outbox.status.${status}`)}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {number(diagnostics.counts[status])}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              {t('dashboard.outbox.asOf', {
                time: formatLocalizedDateTime(diagnostics.generatedAt, i18n.language),
              })}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
              <span>
                {t('dashboard.outbox.duePending')}: <strong>{number(diagnostics.duePending)}</strong>
              </span>
              <span>
                {t('dashboard.outbox.staleProcessing')}:{' '}
                <strong>{number(diagnostics.staleProcessing)}</strong>
              </span>
            </div>

            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {t('dashboard.outbox.deliverySemantics')}
            </p>

            <div className="overflow-x-auto">
              <table className="app-table w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2 pr-3 font-medium">{t('dashboard.outbox.event')}</th>
                    <th className="py-2 pr-3 font-medium">{t('common.status')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.outbox.attempts')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.outbox.lastUpdated')}</th>
                    <th className="py-2 pr-3 font-medium">{t('dashboard.outbox.lastError')}</th>
                    <th className="py-2 font-medium">{t('dashboard.outbox.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-slate-500">
                        {t('dashboard.outbox.noEvents')}
                      </td>
                    </tr>
                  ) : (
                    events.map((event) => {
                      const status = statuses.includes(event.status as OutboxStatus)
                        ? (event.status as OutboxStatus)
                        : null
                      return (
                        <tr
                          key={event.id}
                          className="border-b border-slate-100 dark:border-slate-900"
                        >
                          <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs">
                            #{event.id.slice(0, 8)}
                          </td>
                          <td className="py-2 pr-3">
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                                status
                                  ? statusClasses[status]
                                  : 'border-slate-200 bg-slate-50 text-slate-700'
                              }`}
                            >
                              {status
                                ? t(`dashboard.outbox.status.${status}`)
                                : event.status}
                            </span>
                          </td>
                          <td className="py-2 pr-3">{number(event.attempts)}</td>
                          <td className="whitespace-nowrap py-2 pr-3">
                            {formatLocalizedDateTime(event.updatedAt, i18n.language)}
                          </td>
                          <td className="max-w-xs py-2 pr-3 text-xs text-slate-600 dark:text-slate-300">
                            {event.lastError ?? t('dashboard.outbox.noError')}
                          </td>
                          <td className="whitespace-nowrap py-2">
                            {event.status === 'DEAD_LETTER' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReplayTarget(event)
                                  setReplayAcknowledged(false)
                                  setReplayFailed(false)
                                  setReplaySucceeded(false)
                                }}
                              >
                                {t('dashboard.outbox.replay')}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </CardContent>
      <Dialog
        open={Boolean(replayTarget)}
        onOpenChange={(open) => {
          if (open || replayLoading) return
          setReplayTarget(null)
          setReplayAcknowledged(false)
          setReplayFailed(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard.outbox.replayDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('dashboard.outbox.replayDialogDescription', {
                eventId: replayTarget?.id.slice(0, 8) ?? '',
                attempts: number(replayTarget?.attempts),
              })}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="warning">
            <AlertDescription>{t('dashboard.outbox.replayWarning')}</AlertDescription>
          </Alert>
          <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-red-600"
              checked={replayAcknowledged}
              onChange={(event) => setReplayAcknowledged(event.target.checked)}
            />
            <span>{t('dashboard.outbox.replayAcknowledgment')}</span>
          </label>
          {replayFailed ? (
            <Alert variant="destructive">
              <AlertDescription>{t('dashboard.outbox.replayFailed')}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={replayLoading}
              onClick={() => {
                setReplayTarget(null)
                setReplayAcknowledged(false)
                setReplayFailed(false)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!replayAcknowledged || replayLoading}
              onClick={() => void submitReplay()}
            >
              {replayLoading
                ? t('dashboard.outbox.replaying')
                : t('dashboard.outbox.confirmReplay')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
