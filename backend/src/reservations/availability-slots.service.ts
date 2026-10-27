import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getDateOnlyDayBounds,
  parseDateOnlyString,
} from '../common/utils/date-only';
import { ReservationDateService } from './reservation-date.service';
import {
  generateSlots,
  timeToMinutes,
} from './utils/time-slot.utils';
import { getStylistProfilesForSlots } from './utils/availability-helpers';
import { SLOT_HOLD_INBOX_STATUSES, SLOT_OCCUPYING_STATUSES } from './constants';
import { computeSlotCapacity } from './utils/slot-hold.utils';
import { buildBookableServiceWhere } from './utils/service-eligibility';
import type { AvailableSlotDto } from './availability.types';

type AvailabilityReader = Pick<
  Prisma.TransactionClient,
  | 'salonSettings'
  | 'service'
  | 'holiday'
  | 'salonWorkingHours'
  | 'stylistService'
  | 'stylistProfile'
  | 'reservation'
>;

@Injectable()
export class AvailabilitySlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
  ) {}

  async getAvailableSlots(
    serviceIdsInput: string[] | string,
    dateStr: string,
    db: AvailabilityReader = this.prisma,
  ): Promise<AvailableSlotDto[]> {
    const serviceIds = Array.isArray(serviceIdsInput)
      ? serviceIdsInput
      : [serviceIdsInput];
    const salon = await db.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const normalized = [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))];
    if (normalized.length === 0)
      throw new NotFoundException('Servis nije pronađen.');
    const services = await db.service.findMany({
      where: buildBookableServiceWhere(normalized),
      select: { id: true, durationMinutes: true },
    });
    if (services.length !== normalized.length)
      throw new NotFoundException('Servis nije pronađen.');
    const totalDurationMinutes = services.reduce(
      (acc, s) => acc + (s.durationMinutes ?? 0),
      0,
    );

    let date: Date;
    try {
      date = parseDateOnlyString(dateStr);
    } catch {
      throw new BadRequestException('Datum nije validan.');
    }
    const dayOfWeek = date.getUTCDay();
    const { gte: dateStart, lt: nextDateStart } =
      getDateOnlyDayBounds(dateStr);

    const holidays = await db.holiday.findMany({
      where: {
        salonSettingsId: salon.id,
        date: { gte: dateStart, lt: nextDateStart },
      },
    });
    if (holidays.length > 0) return [];

    const salonHours = await db.salonWorkingHours.findUnique({
      where: {
        salonSettingsId_dayOfWeek: {
          salonSettingsId: salon.id,
          dayOfWeek,
        },
      },
    });
    if (!salonHours || !salonHours.isWorkingDay) return [];

    const stylists = await getStylistProfilesForSlots(
      db,
      normalized,
      dayOfWeek,
      dateStr,
    );
    if (stylists.length === 0) return [];

    const slots = generateSlots(
      salonHours.openTime,
      salonHours.closeTime,
      totalDurationMinutes,
      salon.pauseBetweenServices,
    );

    const now = new Date();
    const todayStr = this.dates.toSalonDateOnlyString(now);
    const nowMinutes = timeToMinutes(this.dates.toSalonTimeString(now));
    const filteredSlots =
      dateStr === todayStr
        ? slots.filter((s) => timeToMinutes(s.startTime) >= nowMinutes)
        : slots;

    const reservations = await db.reservation.findMany({
      where: {
        reservationDate: { gte: dateStart, lt: nextDateStart },
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
    });

    return filteredSlots
      .map((slot) => {
        const slotStart = timeToMinutes(slot.startTime);
        const slotEnd = timeToMinutes(slot.endTime);
        const stylistIdsInWindow = stylists
          .filter((sp) => slotStart < sp.window.end && slotEnd > sp.window.start)
          .map((sp) => sp.id);
        const { availableStylistCount, hasInboxHold } = computeSlotCapacity({
          slotStart: slot.startTime,
          slotEnd: slot.endTime,
          stylistIdsInWindow,
          reservations,
        });
        const holdState =
          availableStylistCount === 0 && hasInboxHold ? 'pending_hold' : 'none';
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          availableStylistCount,
          holdState,
        } satisfies AvailableSlotDto;
      })
      .filter((s) => s.availableStylistCount > 0 || s.holdState === 'pending_hold');
  }
}
