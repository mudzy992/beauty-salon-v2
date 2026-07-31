import { Badge } from '../../../components/ui/badge'
import { EmptyState } from './data-state'

export type HistoryEvent = {
  id: string
  action: string
  reason?: string | null
  createdAt: string
  createdBy?: { id: string; username: string } | null
}

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('bs-BA')
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
                <Badge variant="outline">{event.action}</Badge>
                <span className="text-slate-500">
                  {formatTimestamp(event.createdAt)}
                </span>
                <span className="text-slate-500">
                  {event.createdBy?.username ?? 'sistem'}
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
