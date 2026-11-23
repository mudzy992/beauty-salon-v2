import type { BadgeProps } from '../../components/ui/badge'

export const statusBadgeVariant: Record<string, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'warning',
  STYLIST_REVIEW: 'warning',
  CONFIRMED: 'secondary',
  ATTENDANCE_CONFIRMED: 'secondary',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_STYLISTS: 'danger',
  NO_SHOW: 'secondary',
}

