import {
  AlertCircle,
  BookOpen,
  CalendarCheck,
  CheckCheck,
  CheckCircle2,
  Clock,
  Eye,
  PlayCircle,
  UserX,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../../../lib/cn'

export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

export type StatusDescriptor = { labelKey: string; tone: StatusTone; icon: LucideIcon }

const toneClass: Record<StatusTone, string> = {
  ok: 'bg-ok text-ok-foreground',
  warn: 'bg-warn text-warn-foreground',
  bad: 'bg-bad text-bad-foreground',
  info: 'bg-info text-info-foreground',
  neutral: 'bg-neutral text-neutral-foreground',
}

export type ReservationStatus =
  | 'PENDING'
  | 'STYLIST_REVIEW'
  | 'CONFIRMED'
  | 'ATTENDANCE_CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_STYLISTS'
  | 'NO_SHOW'
  | 'AWAITING_DAILY_LOG'
  | 'CANCELLED_UNCONFIRMED_ATTENDANCE'

/** NEJRA §11 — FSM statusi koriste POSTOJEĆE ključeve; nema duplikata prijevoda. */
export const reservationStatusMap: Record<ReservationStatus, StatusDescriptor> = {
  PENDING: { labelKey: 'reservations.statuses.PENDING', tone: 'warn', icon: Clock },
  STYLIST_REVIEW: { labelKey: 'reservations.statuses.STYLIST_REVIEW', tone: 'info', icon: Eye },
  CONFIRMED: { labelKey: 'reservations.statuses.CONFIRMED', tone: 'ok', icon: CheckCircle2 },
  ATTENDANCE_CONFIRMED: {
    labelKey: 'reservations.statuses.ATTENDANCE_CONFIRMED', tone: 'ok', icon: CalendarCheck,
  },
  IN_PROGRESS: { labelKey: 'reservations.statuses.IN_PROGRESS', tone: 'info', icon: PlayCircle },
  COMPLETED: { labelKey: 'reservations.statuses.COMPLETED', tone: 'ok', icon: CheckCheck },
  CANCELLED_BY_CLIENT: {
    labelKey: 'reservations.statuses.CANCELLED_BY_CLIENT', tone: 'bad', icon: UserX,
  },
  CANCELLED_BY_STYLISTS: {
    labelKey: 'reservations.statuses.CANCELLED_BY_STYLISTS', tone: 'bad', icon: Users,
  },
  NO_SHOW: { labelKey: 'reservations.statuses.NO_SHOW', tone: 'bad', icon: XCircle },
  AWAITING_DAILY_LOG: {
    labelKey: 'reservations.statuses.AWAITING_DAILY_LOG', tone: 'warn', icon: BookOpen,
  },
  CANCELLED_UNCONFIRMED_ATTENDANCE: {
    labelKey: 'reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE', tone: 'bad', icon: AlertCircle,
  },
}

/** WCAG 1.4.1 — boja nikad nije jedini nosilac: uz ton idu ikona i tekst. */
export const StatusBadge = ({
  status,
  label,
  className,
}: {
  status: StatusDescriptor
  label?: string
  className?: string
}) => {
  const { t } = useTranslation()
  const Icon = status.icon

  return (
    <span
      data-admin-badge
      data-aurum-badge
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        toneClass[status.tone],
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {label ?? t(status.labelKey)}
    </span>
  )
}
