import type { LucideIcon } from 'lucide-react'
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
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../../../lib/cn'

export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

export type StatusDescriptor = {
  labelKey: string
  tone: StatusTone
  icon: LucideIcon
}

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

/**
 * Rezervacijski FSM statusi. Oznake koriste postojeće ključeve
 * `reservations.statuses.*`, pa se ne uvode duplikati prijevoda.
 */
export const reservationStatusMap: Record<ReservationStatus, StatusDescriptor> = {
  PENDING: { labelKey: 'reservations.statuses.PENDING', tone: 'warn', icon: Clock },
  STYLIST_REVIEW: { labelKey: 'reservations.statuses.STYLIST_REVIEW', tone: 'info', icon: Eye },
  CONFIRMED: { labelKey: 'reservations.statuses.CONFIRMED', tone: 'ok', icon: CheckCircle2 },
  ATTENDANCE_CONFIRMED: {
    labelKey: 'reservations.statuses.ATTENDANCE_CONFIRMED',
    tone: 'ok',
    icon: CalendarCheck,
  },
  IN_PROGRESS: { labelKey: 'reservations.statuses.IN_PROGRESS', tone: 'info', icon: PlayCircle },
  COMPLETED: { labelKey: 'reservations.statuses.COMPLETED', tone: 'ok', icon: CheckCheck },
  CANCELLED_BY_CLIENT: {
    labelKey: 'reservations.statuses.CANCELLED_BY_CLIENT',
    tone: 'bad',
    icon: UserX,
  },
  CANCELLED_BY_STYLISTS: {
    labelKey: 'reservations.statuses.CANCELLED_BY_STYLISTS',
    tone: 'bad',
    icon: Users,
  },
  NO_SHOW: { labelKey: 'reservations.statuses.NO_SHOW', tone: 'bad', icon: XCircle },
  AWAITING_DAILY_LOG: {
    labelKey: 'reservations.statuses.AWAITING_DAILY_LOG',
    tone: 'warn',
    icon: BookOpen,
  },
  CANCELLED_UNCONFIRMED_ATTENDANCE: {
    labelKey: 'reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE',
    tone: 'bad',
    icon: AlertCircle,
  },
}

type StatusBadgeProps = {
  status: StatusDescriptor
  className?: string
}

/**
 * WCAG 1.4.1 Use of color — status nikad nije samo boja: uz ton ide ikona i
 * tekst. Kontrasti tonova su u `check_ui_contrast.py` (ok 6.50:1, warn 7.50:1,
 * bad 6.80:1, info 7.13:1, neutral 8.23:1 — light).
 */
export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const { t } = useTranslation()
  const Icon = status.icon

  return (
    <span
      data-admin-badge
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        toneClass[status.tone],
        className,
      )}
    >
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {t(status.labelKey)}
    </span>
  )
}

export const ReservationStatusBadge = ({
  status,
  className,
}: {
  status: ReservationStatus
  className?: string
}) => <StatusBadge status={reservationStatusMap[status]} className={className} />
