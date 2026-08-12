export type PushRouteTarget = {
  pathname: string;
  params?: Record<string, string>;
};

const CLIENT_RESERVATION_KINDS = new Set([
  'reservation_confirmed',
  'reservation_cancelled',
  'attendance_timeout_cancelled',
  'reservation_reschedule',
  'reservation_reorder',
  'delay_warning',
]);

function clientReservationsRoute(reservationId?: string): PushRouteTarget {
  if (reservationId) {
    return {
      pathname: '/reservations/[reservationId]',
      params: { reservationId },
    };
  }
  return { pathname: '/reservations' };
}

function stylistScheduleDetailRoute(reservationId?: string): PushRouteTarget {
  if (reservationId) {
    return {
      pathname: '/stylist/schedule/reservation-detail/[reservationId]',
      params: { reservationId },
    };
  }
  return { pathname: '/stylist/schedule' };
}

/** Resolve deep-link from push payload (kind preferred over type). */
export const resolvePushRoute = (
  data: Record<string, unknown>,
): PushRouteTarget | null => {
  const kindRaw = data.kind ?? data.type;
  const kind = typeof kindRaw === 'string' ? kindRaw.trim() : '';
  const type = typeof data.type === 'string' ? data.type.trim() : '';
  const reservationId =
    typeof data.reservationId === 'string' && data.reservationId.trim()
      ? data.reservationId.trim()
      : undefined;

  if (kind === 'reservation_new') {
    return { pathname: '/stylist/inbox' };
  }

  if (kind === 'stylist_reschedule_decision' || kind === 'stylist_reservation_cancelled') {
    return stylistScheduleDetailRoute(reservationId);
  }

  if (CLIENT_RESERVATION_KINDS.has(kind)) {
    return clientReservationsRoute(reservationId);
  }

  if (kind === 'reservation_reminder' && reservationId) {
    return clientReservationsRoute(reservationId);
  }

  if (type === 'client_debt' || kind === 'client_debt') {
    return { pathname: '/profile' };
  }

  if (type === 'payment_receipt' || kind === 'payment_receipt') {
    if (reservationId) {
      return clientReservationsRoute(reservationId);
    }
    return { pathname: '/profile/notifications' };
  }

  if (type === 'holiday' || kind === 'holiday') {
    return { pathname: '/profile/notifications' };
  }

  if (type === 'general' || kind === 'general') {
    return { pathname: '/profile/notifications' };
  }

  if (reservationId) {
    return clientReservationsRoute(reservationId);
  }

  if (kind || type) {
    return { pathname: '/profile/notifications' };
  }

  return null;
};

/** @deprecated Use resolvePushRoute */
export const resolveReservationPushRoute = resolvePushRoute;
