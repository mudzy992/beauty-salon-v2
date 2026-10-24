import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  SLOT_HOLD_INBOX_STATUSES,
  SLOT_OCCUPYING_STATUSES,
} from '../constants';
import { getStylistProfilesForSlots } from './availability-helpers';
import {
  computeSlotCapacity,
  isActiveLock,
  type SlotHoldReservation,
} from './slot-hold.utils';
import { intervalsOverlap, timeToMinutes } from './time-slot.utils';

type BookingCapacityReader = Pick<
  Prisma.TransactionClient,
  'reservation' | 'stylistProfile' | 'stylistService'
>;

type CapacityReservation = SlotHoldReservation & {
  stylistResponses: NonNullable<SlotHoldReservation['stylistResponses']>;
};

/**
 * Recheck salon capacity and the requested stylist assignment inside the
 * booking transaction. Direct staff bookings can use arbitrary wall times,
 * so they cannot rely only on the generated public slot list.
 */
export const assertStylistSlotCapacity = async (input: {
  db: BookingCapacityReader;
  serviceIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  stylistProfileId: string;
}): Promise<void> => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date);
  if (!dateMatch) {
    throw new BadRequestException('Neispravan datum za provjeru kapaciteta.');
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const dayStart = new Date(Date.UTC(year, month - 1, day));
  if (dayStart.toISOString().slice(0, 10) !== input.date) {
    throw new BadRequestException('Neispravan datum za provjeru kapaciteta.');
  }
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  const [stylists, reservations] = await Promise.all([
    getStylistProfilesForSlots(
      input.db,
      input.serviceIds,
      dayStart.getUTCDay(),
      input.date,
    ),
    input.db.reservation.findMany({
      where: {
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: {
          in: [...SLOT_OCCUPYING_STATUSES, ...SLOT_HOLD_INBOX_STATUSES],
        },
      },
      select: {
        startTime: true,
        endTime: true,
        status: true,
        confirmedStylistId: true,
        stylistResponses: {
          select: {
            stylistProfileId: true,
            status: true,
            lockExpiresAt: true,
          },
        },
      },
    }),
  ]);

  const stylistIdsInWindow = stylists
    .filter(({ window }) => window.start <= start && window.end >= end)
    .map(({ id }) => id);
  if (!stylistIdsInWindow.includes(input.stylistProfileId)) {
    throw new BadRequestException(
      'Odabrani stilist ne može izvršiti usluge u ovom terminu.',
    );
  }

  const typedReservations = reservations as CapacityReservation[];
  const now = new Date();
  const overlappingStylistReservation = typedReservations.some(
    (reservation) => {
      if (
        !intervalsOverlap(
          start,
          end,
          timeToMinutes(reservation.startTime),
          timeToMinutes(reservation.endTime),
        )
      ) {
        return false;
      }

      if (
        SLOT_OCCUPYING_STATUSES.includes(
          reservation.status as (typeof SLOT_OCCUPYING_STATUSES)[number],
        )
      ) {
        return reservation.confirmedStylistId === input.stylistProfileId;
      }

      return (
        SLOT_HOLD_INBOX_STATUSES.includes(
          reservation.status as (typeof SLOT_HOLD_INBOX_STATUSES)[number],
        ) &&
        reservation.stylistResponses.some(
          (response) =>
            response.stylistProfileId === input.stylistProfileId &&
            isActiveLock(response, now),
        )
      );
    },
  );
  if (overlappingStylistReservation) {
    throw new BadRequestException(
      'Odabrani stilist već ima zauzet termin ili aktivno zaključan zahtjev u tom periodu.',
    );
  }

  const capacity = computeSlotCapacity({
    slotStart: input.startTime,
    slotEnd: input.endTime,
    stylistIdsInWindow,
    reservations: typedReservations,
    now,
  });
  if (capacity.availableStylistCount < 1) {
    throw new BadRequestException(
      'Odabrani termin više nema slobodnog kapaciteta.',
    );
  }
};
