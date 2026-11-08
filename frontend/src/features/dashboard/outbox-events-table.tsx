import { AlertCircle, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { DataTable, type DataTableColumn } from '../shell/admin/ui/data-table'
import { EmptyState } from '../shell/admin/ui/data-state'
import { StatusBadge, type StatusDescriptor, type StatusTone } from '../shell/admin/ui/status-badge'
import { OUTBOX_STATUSES, type OutboxDiagnosticEvent, type OutboxStatus } from './use-outbox'

type Tone = { tone: StatusTone; icon: LucideIcon }

const outboxTone: Record<OutboxStatus, Tone> = {
  PENDING: { tone: 'warn', icon: CircleDashed },
  PROCESSING: { tone: 'info', icon: Loader2 },
  DELIVERED: { tone: 'ok', icon: CheckCircle2 },
  DEAD_LETTER: { tone: 'bad', icon: AlertCircle },
}

const resolveOutboxStatus = (status: string): StatusDescriptor => {
  const known = OUTBOX_STATUSES.find((candidate) => candidate === status)
  return {
    labelKey: known ? `dashboard.outbox.status.${known}` : 'common.status',
    tone: known ? outboxTone[known].tone : 'neutral',
    icon: known ? outboxTone[known].icon : CircleDashed,
  }
}

type Props = {
  events: OutboxDiagnosticEvent[]
  onReplay: (event: OutboxDiagnosticEvent) => void
}

export const OutboxEventsTable = ({ events, onReplay }: Props) => {
  const { t, i18n } = useTranslation()

  const number = (value: unknown) =>
    formatLocalizedNumber(
      typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0,
      i18n.language,
      { maximumFractionDigits: 0 },
    )

  const columns: DataTableColumn<OutboxDiagnosticEvent>[] = [
    {
      key: 'event',
      headerKey: 'dashboard.outbox.event',
      render: (event) => (
        <span className="font-mono text-xs">
          <span className="block whitespace-nowrap">{event.eventType}</span>
          <span className="block whitespace-nowrap text-content-muted">
            #{event.id.slice(0, 8)}
          </span>
        </span>
      ),
    },
    {
      key: 'status',
      headerKey: 'common.status',
      render: (event) => (
        <StatusBadge
          status={resolveOutboxStatus(event.status)}
          label={
            OUTBOX_STATUSES.includes(event.status as OutboxStatus)
              ? t(`dashboard.outbox.status.${event.status}`)
              : event.status
          }
        />
      ),
    },
    { key: 'attempts', headerKey: 'dashboard.outbox.attempts', render: (event) => number(event.attempts) },
    {
      key: 'lastUpdated',
      headerKey: 'dashboard.outbox.lastUpdated',
      className: 'whitespace-nowrap',
      render: (event) => (
        <time dateTime={event.updatedAt}>
          {formatLocalizedDateTime(event.updatedAt, i18n.language)}
        </time>
      ),
    },
    {
      key: 'lastError',
      headerKey: 'dashboard.outbox.lastError',
      className: 'max-w-xs text-xs text-content-muted',
      render: (event) => event.lastError ?? t('dashboard.outbox.noError'),
    },
    {
      key: 'actions',
      headerKey: 'dashboard.outbox.actions',
      className: 'whitespace-nowrap',
      render: (event) =>
        event.status === 'DEAD_LETTER' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onReplay(event)}
            // WCAG 4.1.2 — svaki red ima jedinstveno ime akcije, ne isto „Ponovi" svugdje.
            aria-label={t('dashboard.outbox.replayForEvent', { eventId: event.id.slice(0, 8) })}
          >
            {t('dashboard.outbox.replay')}
          </Button>
        ) : null,
    },
  ]

  return (
    <DataTable
      caption={t('dashboard.outbox.title')}
      columns={columns}
      rows={events}
      rowKey={(event) => event.id}
      empty={<EmptyState title={t('dashboard.outbox.noEvents')} />}
    />
  )
}
