import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toLocalDateOnlyString } from '../common/utils/date-only';
import { getDayStartEnd } from '../common/utils/date-range';
import {
  generateSlots,
  timeToMinutes,
} from './utils/time-slot.utils';
import { getStylistProfilesForSlots } from './utils/availability-helpers';
import { SLOT_HOLD_INBOX_STATUSES, SLOT_OCCUPYING_STATUSES } from './constants';
import { computeSlotCapacity } from './utils/slot-hold.utils';
import type { AvailableSlotDto } from './availability.types';

@Injectable()
export class AvailabilitySlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableSlots(
    serviceIdsInput: string[] | string,
    dateStr: string,
  ): Promise<AvailableSlotDto[]> {
    const serviceIds = Array.isArray(serviceIdsInput)
      ? serviceIdsInput
      : [serviceIdsInput];
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');

    const normalized = [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))];
    if (normalized.length === 0)
      throw new NotFoundException('Servis nije pronađen.');
    const services = await this.prisma.service.findMany({
      where: { id: { in: normalized } },
      select: { id: true, durationMinutes: true },
    });
    if (services.length !== normalized.length)
      throw new NotFoundException('Servis nije pronađen.');
    const totalDurationMinutes = services.reduce(
      (acc, s) => acc + (s.durationMinutes ?? 0),
      0,
    );

    const parts = dateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
    const dayOfWeek = date.getDay();

    const holidays = await this.prisma.holiday.findMany({
      where: {
        salonSettingsId: salon.id,
        date: {
          gte: new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0),
          lte: new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999),
        },
      },
    });
    if (holidays.length > 0) return [];

    const salonHours = await this.prisma.salonWorkingHours.findUnique({
      where: {
        salonSettingsId_dayOfWeek: {
          salonSettingsId: salon.id,
          dayOfWeek,
        },
      },
    });
    if (!salonHours || !salonHours.isWorkingDay) return [];

    const stylists = await getStylistProfilesForSlots(
      this.prisma,
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

    const todayStr = toLocalDateOnlyString(new Date());
    const nowMinutes = timeToMinutes(
      `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    );
    const filteredSlots =
      dateStr === todayStr
        ? slots.filter((s) => timeToMinutes(s.startTime) >= nowMinutes)
        : slots;

    const { start: dateStart, end: dateEnd } = getDayStartEnd(date);
    const reservations = await this.prisma.reservation.findMany({
      where: {
        reservationDate: { gte: dateStart, lte: dateEnd },
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
