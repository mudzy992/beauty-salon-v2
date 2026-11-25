/**
 * Tipovi admin obavijesti (S9).
 *
 * Izdvojeno iz `pages/Notifications.tsx` bez promjene oblika podataka.
 */

export interface Notification {
  id: string
  title: string
  body: string
  type: string
  channel: string
  isRead: boolean
  sentAt: string
  readAt: string | null
}

export interface NotifPreference {
  id: string
  type: string
  pushEnabled: boolean
  emailEnabled: boolean
}

export interface CampaignEmailConsent {
  optedIn: boolean
  consentedAt: string | null
  withdrawnAt: string | null
}

/** Vrste obavijesti koje admin može uključiti/isključiti po kanalu. */
export const NOTIFICATION_TYPES = [
  'RESERVATION_NEW',
  'RESERVATION_CONFIRMED',
  'RESERVATION_CANCELLED',
  'RESERVATION_REMINDER',
  'HOLIDAY',
  'REVIEW_NEW',
  'GENERAL',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

/** Varijanta `Badge`-a po kanalu dostave (isto mapiranje kao prije). */
export const channelBadgeVariant = (channel: string): 'secondary' | 'brand' | 'outline' => {
  if (channel === 'PUSH') return 'secondary'
  if (channel === 'EMAIL') return 'brand'
  return 'outline'
}
