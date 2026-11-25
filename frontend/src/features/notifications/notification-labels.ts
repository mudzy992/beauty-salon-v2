import { useTranslation } from 'react-i18next'

/**
 * Lokalizovani nazivi tipova i kanala obavijesti (S9).
 *
 * Izdvojeno iz `pages/Notifications.tsx` bez promjene: iste `switch` grane, isti
 * `default` pad (`type.replace(/_/g, ' ')`) i iste i18n ključeve.
 */
export function useNotificationLabels() {
  const { t } = useTranslation()

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'RESERVATION_NEW':
      case 'reservation_new':
        return t('notifications.types.reservationNew')
      case 'RESERVATION_CONFIRMED':
      case 'reservation_confirmed':
        return t('notifications.types.reservationConfirmed')
      case 'RESERVATION_CANCELLED':
      case 'reservation_cancelled':
        return t('notifications.types.reservationCancelled')
      case 'RESERVATION_REMINDER':
      case 'reservation_reminder':
        return t('notifications.types.reservationReminder')
      case 'RESERVATION_RESCHEDULE':
      case 'reservation_reschedule':
        return t('notifications.types.reservationReschedule')
      case 'CLIENT_DEBT':
      case 'client_debt':
        return t('notifications.types.clientDebt')
      case 'PAYMENT_RECEIPT':
      case 'payment_receipt':
        return t('notifications.types.paymentReceipt')
      case 'HOLIDAY':
      case 'holiday':
        return t('notifications.types.holiday')
      case 'REVIEW_NEW':
      case 'review_new':
        return t('notifications.types.reviewNew')
      case 'GENERAL':
      case 'general':
        return t('notifications.types.general')
      default:
        return type.replace(/_/g, ' ')
    }
  }

  const getChannelLabel = (channel: string) => {
    if (channel === 'PUSH') return t('notifications.channelPush')
    if (channel === 'EMAIL') return t('notifications.channelEmail')
    if (channel === 'BOTH') return t('notifications.channelBoth')
    return channel
  }

  return { getNotificationTypeLabel, getChannelLabel }
}
