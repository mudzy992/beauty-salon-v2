import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { SLOT_OCCUPYING_STATUSES } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { timeToMinutes } from './utils/time-slot.utils';
import { assertAdminSlotWithinWorkingHours } from './utils/assert-admin-working-hours';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';

@Injectable()
export class ReservationUpdateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly queries: ReservationQueriesService,
    private readonly notify: ReservationNotifyService,
  ) {}

  async updateByAdmin(reservationId: string, dto: UpdateReservationDto) {
    const existing = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        status: true,
        confirmedStylistId: true,
        serviceId: true,
        clientId: true,
        publicReferenceCode: true,
        clientViewToken: true,
        items: { select: { serviceId: true } },
      },
    });
    if (!existing)
      throw new NotFoundException('Rezervacija nije pronađena.');
    const nextDate = dto.reservationDate
      ? this.dates.parseDateOnly(dto.reservationDate)
      : this.dates.parseDateOnly(existing.reservationDate);
    const nextStartTime = (dto.startTime ?? existing.startTime).trim();
    const nextEndTime = (dto.endTime ?? existing.endTime).trim();
    if (!nextStartTime || !nextEndTime)
      throw new BadRequestException('Neispravno vrijeme termina.');
    if (timeToMinutes(nextEndTime) <= timeToMinutes(nextStartTime))
      throw new BadRequestException(
        'Vrijeme završetka mora biti nakon početka.',
      );
    await assertAdminSlotWithinWorkingHours({
      prisma: this.prisma,
      reservationDate: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      confirmedStylistId: existing.confirmedStylistId,
    });
    const serviceIds =
      existing.items.length > 0
        ? existing.items.map((item) => item.serviceId)
        : [existing.serviceId];
    await assertClientDayBookingAllowed({
      prisma: this.prisma,
      clientId: existing.clientId,
      reservationDate: nextDate,
      startTime: nextStartTime,
      endTime: nextEndTime,
      serviceIds,
      excludeReservationId: existing.id,
    });
    const stylistId = existing.confirmedStylistId;
    if (stylistId) {
      const dayStart = new Date(nextDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(nextDate);
      dayEnd.setUTCHours(23, 59, 59, 999);
      const conflict = await this.prisma.reservation.findFirst({
        where: {
          id: { not: existing.id },
          confirmedStylistId: stylistId,
          reservationDate: { gte: dayStart, lte: dayEnd },
          status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
          OR: [
            {
              AND: [
                { startTime: { lt: nextEndTime } },
                { endTime: { gt: nextStartTime } },
              ],
            },
          ],
        },
        select: { id: true, startTime: true, endTime: true },
      });
      if (conflict) {
        throw new BadRequestException(
          `Preklapanje sa drugim terminom (${conflict.startTime}–${conflict.endTime}).`,
        );
      }
    }
    const nextDateStr = this.dates.toLocalDateOnlyString(nextDate);
    const scheduleChanged =
      this.dates.toLocalDateOnlyString(existing.reservationDate) !==
        nextDateStr ||
      existing.startTime.trim().slice(0, 5) !== nextStartTime.slice(0, 5) ||
      existing.endTime.trim().slice(0, 5) !== nextEndTime.slice(0, 5);
    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        reservationDate: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime,
      },
    });
    const full = await this.queries.findOne(updated.id, {
      sub: '',
      roles: ['SYSTEM_ADMIN'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, full);
    this.events.emitToUser(existing.clientId, SOCKET_EVENTS.RESERVATION_UPDATED, full);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: existing.serviceId,
      date: nextDateStr,
    });
    if (scheduleChanged) {
      await this.notify.notifyClientTimeChanged({
        clientId: existing.clientId,
        reservationId: existing.id,
        date: nextDateStr,
        startTime: nextStartTime.slice(0, 5),
        endTime: nextEndTime.slice(0, 5),
        publicReferenceCode: existing.publicReferenceCode,
        clientViewToken: existing.clientViewToken,
      });
    }
    return full;
  }
}
