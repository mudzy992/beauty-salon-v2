export const SOCKET_EVENTS = {
  RESERVATION_CREATED: 'reservation:created',
  RESERVATION_UPDATED: 'reservation:updated',
  RESERVATION_CANCELLED: 'reservation:cancelled',
  RESERVATION_CONFIRMED: 'reservation:confirmed',
  RESERVATION_STYLIST_RESPONSE: 'reservation:stylist_response',

  NOTIFICATION_NEW: 'notification:new',

  SETTINGS_UPDATED: 'settings:updated',

  SALON_UPDATED: 'salon:updated',

  AVAILABILITY_CHANGED: 'availability:changed',
} as const;
