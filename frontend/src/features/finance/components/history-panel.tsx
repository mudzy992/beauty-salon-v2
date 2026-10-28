import { useTranslation } from 'react-i18next'
import { formatLocalizedDateTime } from '../../../i18n/locale-utils.mjs'

import { Badge } from '../../../components/ui/badge'
import { EmptyState } from './data-state'

export type HistoryEvent = {
  id: string
  action: string
  reason?: string | null
  createdAt: string
  createdBy?: { id: string; username: string } | null
}

const ACTION_KEYS: Record<string, string> = {
  LOCK: 'finance.history.lock',
  UNLOCK: 'finance.history.unlock',
  CREATE: 'finance.history.create',
  UPDATE: 'finance.history.update',
  DELETE: 'finance.history.delete',
}

export function HistoryPanel({
  title,
  events,
  emptyLabel,
}: {
  title: string
  events: HistoryEvent[]
  emptyLabel: string
}) {
  const { t, i18n } = useTranslation()
  return (
    <section aria-label={title} className="grid gap-2">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
        {title}
      </h3>
      {events.length === 0 ? (
        <EmptyState title={emptyLabel} />
      ) : (
        <ul className="grid gap-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-md border border-slate-200 p-2 text-xs dark:border-slate-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {ACTION_KEYS[event.action]
                    ? t(ACTION_KEYS[event.action])
                    : event.action}
                </Badge>
                <span className="text-slate-500">
                  {formatLocalizedDateTime(event.createdAt, i18n.language)}
                </span>
                <span className="text-slate-500">
                  {event.createdBy?.username ?? t('finance.history.system')}
                </span>
              </div>
              {event.reason ? (
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {event.reason}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
