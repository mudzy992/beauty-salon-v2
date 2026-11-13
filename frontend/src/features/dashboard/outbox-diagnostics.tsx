import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { StatGrid } from '../shell/admin/ui/stat-grid'
import { OutboxEventsTable } from './outbox-events-table'
import { OutboxReplayDialog } from './outbox-replay-dialog'
import {
  OUTBOX_STATUSES,
  useOutboxDiagnostics,
  type OutboxDiagnosticEvent,
} from './use-outbox'

/**
 * Outbox dijagnostika — tanka kompozicija.
 *
 * Podaci i replay mutacija su u `use-outbox.ts`, tabela u `outbox-events-table.tsx`,
 * potvrda u `outbox-replay-dialog.tsx`. Role gate (`SYSTEM_ADMIN`/`OWNER`) ostaje
 * u `pages/Dashboard.tsx`, ne ovdje.
 */
export const DashboardOutboxDiagnostics = () => {
  const { t, i18n } = useTranslation()
  const [replayTarget, setReplayTarget] = useState<OutboxDiagnosticEvent | null>(null)
  const {
    diagnostics,
    loading,
    failed,
    refresh,
    replayLoading,
    replayFailed,
    replaySucceeded,
    submitReplay,
  } = useOutboxDiagnostics()

  const number = (value: unknown) =>
    formatLocalizedNumber(
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0,
      i18n.language,
      { maximumFractionDigits: 0 },
    )

  const closeReplay = () => setReplayTarget(null)
  const events = (diagnostics?.recentEvents ?? []).slice(0, 10)

  return (
    <section className="space-y-4 rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-content">{t('dashboard.outbox.title')}</h2>
          <p className="mt-1 text-xs text-content-muted">{t('dashboard.outbox.description')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={refresh}>
          {loading ? t('dashboard.outbox.refreshing') : t('dashboard.outbox.refresh')}
        </Button>
      </div>

      {/* WCAG 4.1.3 — ishodi radnji se najavljuju, ne samo prikazuju. */}
      <div aria-live="polite" className="space-y-2">
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
      </div>

      {loading && !diagnostics ? (
        <p role="status" className="text-sm text-content-muted">
          {t('common.loading')}
        </p>
      ) : null}

      {diagnostics && !failed ? (
        <>
          <StatGrid
            label={t('dashboard.outbox.title')}
            columns={4}
            items={OUTBOX_STATUSES.map((status) => ({
              label: t(`dashboard.outbox.status.${status}`),
              value: number(diagnostics.counts[status]),
            }))}
          />

          <p className="text-xs text-content-muted">
            {t('dashboard.outbox.asOf', {
              time: formatLocalizedDateTime(diagnostics.generatedAt, i18n.language),
            })}
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-content">
            <span>
              {t('dashboard.outbox.duePending')}: <strong>{number(diagnostics.duePending)}</strong>
            </span>
            <span>
              {t('dashboard.outbox.staleProcessing')}:{' '}
              <strong>{number(diagnostics.staleProcessing)}</strong>
            </span>
          </div>

          <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-content">
            {t('dashboard.outbox.deliverySemantics')}
          </p>

          <OutboxEventsTable events={events} onReplay={setReplayTarget} />
        </>
      ) : null}

      <OutboxReplayDialog
        target={replayTarget}
        loading={replayLoading}
        failed={replayFailed}
        onClose={closeReplay}
        onConfirm={submitReplay}
      />
    </section>
  )
}
