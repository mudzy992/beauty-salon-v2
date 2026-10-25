import { BadRequestException } from '@nestjs/common';
import {
  getDateOnlyDayBounds,
  getDateOnlyWeekday,
} from '../../common/utils/date-only';
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
  id: string;
  stylistResponses: NonNullable<SlotHoldReservation['stylistResponses']>;
};

type AssertReservationSlotCapacityInput = {
  db: BookingCapacityReader;
  serviceIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  stylistProfileId?: string;
  excludeReservationId?: string;
};

/**
 * Recheck salon capacity and, when supplied, a selected stylist assignment
 * inside the booking transaction. Direct staff bookings can use arbitrary
 * wall times, so they cannot rely only on the generated public slot list.
 */
export const assertReservationSlotCapacity = async (
  input: AssertReservationSlotCapacityInput,
): Promise<void> => {
  let dayBounds: ReturnType<typeof getDateOnlyDayBounds>;
  try {
    dayBounds = getDateOnlyDayBounds(input.date);
  } catch {
    throw new BadRequestException('Neispravan datum za provjeru kapaciteta.');
  }
  const dayOfWeek = getDateOnlyWeekday(input.date);

  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  const [stylists, reservations] = await Promise.all([
    getStylistProfilesForSlots(
      input.db,
      input.serviceIds,
      dayOfWeek,
      input.date,
    ),
    input.db.reservation.findMany({
      where: {
        ...(input.excludeReservationId
          ? { id: { not: input.excludeReservationId } }
          : {}),
        reservationDate: { gte: dayBounds.gte, lt: dayBounds.lt },
        status: {
          in: [...SLOT_OCCUPYING_STATUSES, ...SLOT_HOLD_INBOX_STATUSES],
        },
      },
      select: {
        id: true,
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
  if (
    input.stylistProfileId &&
    !stylistIdsInWindow.includes(input.stylistProfileId)
  ) {
    throw new BadRequestException(
      'Odabrani stilist ne može izvršiti usluge u ovom terminu.',
    );
  }

  const typedReservations = reservations as CapacityReservation[];
  const now = new Date();
  const overlappingStylistReservation = input.stylistProfileId
    ? typedReservations.some((reservation) => {
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
      })
    : false;
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

export const assertStylistSlotCapacity = (
  input: Omit<AssertReservationSlotCapacityInput, 'stylistProfileId'> & {
    stylistProfileId: string;
  },
): Promise<void> => assertReservationSlotCapacity(input);
