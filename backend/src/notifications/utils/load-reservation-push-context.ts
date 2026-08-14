import type { PrismaClient } from '@prisma/client';
import { RESERVATION_ATTENDANCE_POLICY } from '../../reservations/constants';
import {
  emptyPushContext,
  type ReservationPushContext,
} from './reservation-push-copy';

const PUSH_CONTEXT_SELECT = {
  publicReferenceCode: true,
  reservationDate: true,
  startTime: true,
  endTime: true,
  attendancePolicy: true,
  service: { select: { name: true } },
  items: {
    select: { sortOrder: true, service: { select: { name: true } } },
    orderBy: { sortOrder: 'asc' as const },
  },
};

export const loadReservationPushContext = async (
  prisma: PrismaClient,
  reservationId: string,
): Promise<ReservationPushContext | null> => {
  const row = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: PUSH_CONTEXT_SELECT,
  });
  if (!row) return null;
  const fromItems = [...row.items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((it) => it.service?.name ?? '')
    .filter(Boolean);
  const serviceNames =
    fromItems.length > 0 ? fromItems : [row.service?.name ?? ''].filter(Boolean);
  return {
    ref: row.publicReferenceCode,
    serviceNames,
    date: row.reservationDate.toISOString().slice(0, 10),
    startTime: row.startTime,
    endTime: row.endTime,
    attendanceRequired:
      row.attendancePolicy === RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED,
  };
};

export const resolvePushContext = async (
  prisma: PrismaClient,
  reservationId: string,
  ref?: string | null,
): Promise<ReservationPushContext> =>
  (await loadReservationPushContext(prisma, reservationId)) ??
  emptyPushContext(reservationId, ref);
