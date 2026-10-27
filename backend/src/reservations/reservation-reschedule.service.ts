import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { getDateOnlyDayBounds } from '../common/utils/date-only';
import { ReservationSharedService } from './reservation-shared.service';
import { RESERVATION_STATUS } from './constants';
import { minutesToTime, timeToMinutes } from './utils/time-slot.utils';

export type RescheduleMode =
  | 'actual_overrun'
  | 'manual_minutes'
  | 'use_break_only';

@Injectable()
export class ReservationRescheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
  ) {}

  async proposeReschedule(
    reservationId: string,
    userId: string,
    opts: {
      includeBreaks: boolean;
      mode?: RescheduleMode;
      manualShiftMinutes?: number;
    },
  ) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        clientId: true,
        confirmedStylistId: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        startedAt: true,
        completedAt: true,
        status: true,
      },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može raditi rekalkulaciju termina.',
      );
    }
    const plannedEnd = this.dates.combineDateAndTime(
      r.reservationDate,
      r.endTime,
    );
    const now = new Date();
    const referenceTime = r.completedAt ?? now;
    const plannedDuration = Math.max(
      0,
      timeToMinutes(r.endTime) - timeToMinutes(r.startTime),
    );
    const lifecycleMinutes =
      r.startedAt instanceof Date
        ? Math.floor(
            (referenceTime.getTime() - r.startedAt.getTime()) / 60000,
          ) - plannedDuration
        : Number.NEGATIVE_INFINITY;
    const diffByClock =
      timeToMinutes(this.dates.toSalonTimeString(referenceTime)) -
      timeToMinutes(r.endTime);
    const diffByTimestamp = Math.floor(
      (referenceTime.getTime() - plannedEnd.getTime()) / 60000,
    );
    const overrunMinutes = Math.max(
      0,
      lifecycleMinutes,
      diffByClock,
      diffByTimestamp,
    );
    const mode = opts.mode ?? 'actual_overrun';
    const manualShift = Math.max(
      0,
      Math.floor(opts.manualShiftMinutes ?? 0),
    );
    const delayMinutes =
      mode === 'manual_minutes'
        ? manualShift
        : mode === 'use_break_only'
          ? 0
          : Math.max(0, overrunMinutes);
    if (delayMinutes <= 0 || mode === 'use_break_only') {
      return {
        mode,
        overrunMinutes: Math.max(0, overrunMinutes),
        delayMinutes: Math.max(0, delayMinutes),
        shiftMinutes: 0,
        includeBreaks: opts.includeBreaks === true,
        items: [] as any[],
      };
    }
    const { gte, lt } = getDateOnlyDayBounds(
      this.dates.toDateOnlyString(r.reservationDate),
    );
    const future = await this.prisma.reservation.findMany({
      where: {
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte, lt },
        startTime: { gt: r.startTime },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          ] as any,
        },
      },
      select: {
        id: true,
        clientId: true,
        startTime: true,
        endTime: true,
        service: { select: { name: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'asc' },
    });
    const pause = salon.pauseBetweenServices ?? 0;
    const breakCount = future.length;
    const maxAbsorb = opts.includeBreaks ? pause * breakCount : 0;
    const absorbTotal = Math.min(delayMinutes, Math.max(0, maxAbsorb));
    const reductions = this.computeBreakReductions(
      breakCount,
      absorbTotal,
      pause,
    );
    const items = future.map((fr, idx) => {
      const reductionUpToThis = reductions
        .slice(0, idx + 1)
        .reduce((s, x) => s + x, 0);
      const shiftMinutes = Math.max(0, delayMinutes - reductionUpToThis);
      const start = timeToMinutes(fr.startTime) + shiftMinutes;
      const end = timeToMinutes(fr.endTime) + shiftMinutes;
      return {
        id: fr.id,
        clientId: fr.clientId,
        serviceName: fr.service?.name ?? '',
        clientName: fr.client
          ? `${fr.client.firstName ?? ''} ${fr.client.lastName ?? ''}`.trim()
          : '',
        oldStartTime: fr.startTime,
        oldEndTime: fr.endTime,
        newStartTime: minutesToTime(start),
        newEndTime: minutesToTime(end),
        shiftMinutes,
        reducedBreakMinutes: reductions[idx] ?? 0,
      };
    });
    const lastShift = items.length
      ? items[items.length - 1].shiftMinutes
      : 0;
    return {
      mode,
      overrunMinutes: Math.max(0, overrunMinutes),
      delayMinutes,
      shiftMinutes: lastShift,
      includeBreaks: opts.includeBreaks === true,
      items,
    };
  }

  computeBreakReductions(
    breakCount: number,
    absorbTotal: number,
    pause: number,
  ): number[] {
    const reductions: number[] = [];
    let remaining = absorbTotal;
    for (let i = 0; i < breakCount; i++) {
      const remainingBreaks = breakCount - i;
      const target = Math.ceil(remaining / remainingBreaks);
      const take = Math.min(pause, Math.max(0, target));
      reductions.push(take);
      remaining -= take;
    }
    return reductions;
  }
}
