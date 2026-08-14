import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { ReservationSharedService } from '../reservations/reservation-shared.service';
import type { ReservationDateService } from '../reservations/reservation-date.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { resolvePushContext } from '../notifications/utils/load-reservation-push-context';
import { buildCancelledCopy } from '../notifications/utils/reservation-push-copy';
import {
  RESERVATION_STATUS,
  SLOT_OCCUPYING_STATUSES,
} from '../reservations/constants';

type ReservationRow = {
  id: string;
  clientId: string;
  confirmedStylistId: string | null;
  reservationDate: Date;
  status: string;
};

type Deps = {
  prisma: PrismaService;
  shared: ReservationSharedService;
  dates: ReservationDateService;
  notifications: NotificationsService;
};

export const assertReorderSlotFree = async (
  deps: Pick<Deps, 'prisma' | 'dates'>,
  reservation: Pick<
    ReservationRow,
    'id' | 'confirmedStylistId' | 'reservationDate'
  >,
  opts: {
    targetDate?: string;
    targetStartTime: string;
    targetEndTime: string;
  },
): Promise<Date> => {
  const nextDate = opts.targetDate
    ? deps.dates.parseDateOnly(opts.targetDate)
    : deps.dates.parseDateOnly(reservation.reservationDate);
  if (!reservation.confirmedStylistId) return nextDate;
  const dayStart = new Date(nextDate);
  const dayEnd = new Date(nextDate);
  dayEnd.setHours(23, 59, 59, 999);
  const conflict = await deps.prisma.reservation.findFirst({
    where: {
      id: { not: reservation.id },
      confirmedStylistId: reservation.confirmedStylistId,
      reservationDate: { gte: dayStart, lte: dayEnd },
      status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
      OR: [
        {
          AND: [
            { startTime: { lt: opts.targetEndTime } },
            { endTime: { gt: opts.targetStartTime } },
          ],
        },
      ],
    },
    select: { id: true },
  });
  if (conflict) {
    throw new BadRequestException('Odabrani termin je zauzet.');
  }
  return nextDate;
};

export const applyDirectReorder = async (
  deps: Pick<Deps, 'prisma' | 'shared' | 'dates'>,
  reservation: Pick<
    ReservationRow,
    'id' | 'reservationDate' | 'status'
  >,
  opts: {
    targetDate?: string;
    targetStartTime: string;
    targetEndTime: string;
  },
): Promise<void> => {
  const nextDate = opts.targetDate
    ? deps.dates.parseDateOnly(opts.targetDate)
    : deps.dates.parseDateOnly(reservation.reservationDate);
  await deps.prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      reservationDate: nextDate,
      startTime: opts.targetStartTime,
      endTime: opts.targetEndTime,
      status: deps.shared.transitionTo(
        reservation.status,
        RESERVATION_STATUS.CONFIRMED,
      ),
      rescheduleStatus: null,
      rescheduleProposedStartTime: null,
      rescheduleProposedEndTime: null,
    },
  });
};

export const notifyClientCancelled = async (
  deps: Pick<Deps, 'prisma' | 'notifications'>,
  reservationId: string,
  clientId: string,
  reason: string,
): Promise<void> => {
  const resWithClient = await deps.prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      publicReferenceCode: true,
      clientViewToken: true,
    },
  });
  const ctx = await resolvePushContext(
    deps.prisma,
    reservationId,
    resWithClient?.publicReferenceCode,
  );
  const copy = buildCancelledCopy({
    ctx,
    title: 'Rezervacija otkazana',
    reason,
  });
  await deps.notifications.send({
    userId: clientId,
    title: copy.title,
    body: copy.body,
    type: 'reservation_cancelled',
    data: {
      reservationId,
      kind: 'reservation_cancelled',
      publicReferenceCode: resWithClient?.publicReferenceCode,
      clientViewToken: resWithClient?.clientViewToken,
    },
    channel: 'PUSH',
  });
};

export const applyStylistCancel = async (
  deps: Deps,
  reservationId: string,
  reason: string,
): Promise<void> => {
  const r = await deps.prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
  await deps.prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: deps.shared.transitionTo(
        r.status,
        RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
      ),
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });
  await notifyClientCancelled(deps, reservationId, r.clientId, reason);
};

export const applyClientCancel = async (
  deps: Deps,
  reservationId: string,
  reason: string,
): Promise<void> => {
  const r = await deps.prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
  await deps.prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: deps.shared.transitionTo(
        r.status,
        RESERVATION_STATUS.CANCELLED_BY_CLIENT,
      ),
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });
  const salon = await deps.prisma.salonSettings.findFirst();
  if (salon) {
    await deps.shared.incrementCancellationCount(r.clientId, {
      maxCancellationsBeforePenalty: salon.maxCancellationsBeforePenalty,
      penaltyDurationDays: salon.penaltyDurationDays,
    });
  }
  await notifyClientCancelled(deps, reservationId, r.clientId, reason);
};

export const applyNoShow = async (
  deps: Deps,
  reservationId: string,
  reason: string,
  applyPenalty: boolean,
): Promise<void> => {
  const r = await deps.prisma.reservation.findUnique({
    where: { id: reservationId },
  });
  if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
  await deps.prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: deps.shared.transitionTo(r.status, RESERVATION_STATUS.NO_SHOW),
      cancelledAt: new Date(),
      cancelReason: reason,
      rescheduleStatus: null,
      rescheduleProposedStartTime: null,
      rescheduleProposedEndTime: null,
    },
  });
  if (applyPenalty) {
    const salon = await deps.prisma.salonSettings.findFirst();
    if (salon) {
      await deps.shared.incrementCancellationCount(r.clientId, {
        maxCancellationsBeforePenalty: salon.maxCancellationsBeforePenalty,
        penaltyDurationDays: salon.penaltyDurationDays,
      });
    }
  }
  const ctx = await resolvePushContext(deps.prisma, reservationId);
  const copy = buildCancelledCopy({
    ctx,
    title: 'Niste došli',
    reason:
      'Rezervacija je označena kao da se klijent nije pojavio. Ako je greška, kontaktirajte salon.',
  });
  await deps.notifications.send({
    userId: r.clientId,
    title: copy.title,
    body: copy.body,
    type: 'reservation_cancelled',
    data: { reservationId, kind: 'reservation_cancelled' },
    channel: 'PUSH',
  });
};
