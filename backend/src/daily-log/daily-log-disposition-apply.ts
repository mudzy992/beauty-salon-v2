import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { ReservationSharedService } from '../reservations/reservation-shared.service';
import type { ReservationDateService } from '../reservations/reservation-date.service';
import type { NotificationsService } from '../notifications/notifications.service';
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
  await deps.notifications.send({
    userId: clientId,
    title: 'Rezervacija otkazana',
    body: reason,
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
  await deps.notifications.send({
    userId: r.clientId,
    title: 'No-show',
    body: 'Rezervacija je označena kao "nije se pojavio/la". Ako je greška, kontaktirajte salon.',
    type: 'reservation_cancelled',
    data: { reservationId, kind: 'reservation_cancelled' },
    channel: 'PUSH',
  });
};
