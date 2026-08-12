import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { StylistDirectCreateReservationDto } from './dto/stylist-direct-create-reservation.dto';
import {
  ATTENDANCE_CONFIRMED_BY,
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_ATTENDANCE_POLICY,
  RESERVATION_BOOKING_ORIGIN,
  RESERVATION_STATUS,
  SLOT_OCCUPYING_STATUSES,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { timeToMinutes } from './utils/time-slot.utils';
import { assertAdminSlotWithinWorkingHours } from './utils/assert-admin-working-hours';

@Injectable()
export class ReservationDirectCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async createByAdmin(dto: AdminCreateReservationDto, userId: string) {
    const stylistProfileId = dto.stylistProfileId?.trim();
    if (!stylistProfileId) {
      throw new BadRequestException('Stilist je obavezan za direktnu rezervaciju.');
    }
    return this.createDirectReservation({
      dto,
      actorUserId: userId,
      actorRoles: ['SYSTEM_ADMIN'],
      stylistProfileId,
      bookingOrigin: RESERVATION_BOOKING_ORIGIN.STAFF_ADMIN,
    });
  }

  async createByStylist(dto: StylistDirectCreateReservationDto, userId: string) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId) {
      throw new ForbiddenException('Nemate profil stilista.');
    }
    return this.createDirectReservation({
      dto,
      actorUserId: userId,
      actorRoles: ['STYLIST'],
      stylistProfileId,
      bookingOrigin: RESERVATION_BOOKING_ORIGIN.STAFF_STYLIST,
    });
  }

  private async createDirectReservation(params: {
    dto: Pick<
      StylistDirectCreateReservationDto,
      'clientId' | 'clientNotes' | 'endTime' | 'reservationDate' | 'serviceId' | 'serviceIds' | 'startTime'
    >;
    actorUserId: string;
    actorRoles: string[];
    stylistProfileId: string;
    bookingOrigin:
      | typeof RESERVATION_BOOKING_ORIGIN.STAFF_ADMIN
      | typeof RESERVATION_BOOKING_ORIGIN.STAFF_STYLIST;
  }) {
    const { dto, actorUserId, actorRoles, stylistProfileId, bookingOrigin } =
      params;
    const client = await this.shared.getClientForReservation(dto.clientId, {
      ignoreMustChangePassword: true,
    });
    const serviceIdsRaw =
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : dto.serviceId
          ? [dto.serviceId]
          : [];
    const serviceIds = [
      ...new Set(serviceIdsRaw.map((x) => x.trim()).filter(Boolean)),
    ];
    if (serviceIds.length === 0) {
      throw new BadRequestException('SERVICE_REQUIRED');
    }
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, gender: true, price: true },
    });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Servis nije pronađen.');
    }
    if (services.some((service) => service.gender !== client.gender)) {
      throw new BadRequestException('SERVICE_GENDER_MISMATCH');
    }
    const eligibleStylists =
      await this.shared.getEligibleStylistsForServices(serviceIds);
    if (!eligibleStylists.includes(stylistProfileId)) {
      throw new BadRequestException(
        'Odabrani stilist ne može izvršiti sve odabrane usluge.',
      );
    }
    const reservationDate = this.dates.parseDateOnly(dto.reservationDate);
    if (timeToMinutes(dto.endTime) <= timeToMinutes(dto.startTime)) {
      throw new BadRequestException(
        'Vrijeme završetka mora biti nakon početka.',
      );
    }
    await assertAdminSlotWithinWorkingHours({
      prisma: this.prisma,
      reservationDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      confirmedStylistId: stylistProfileId,
    });
    const dayStart = new Date(reservationDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(reservationDate);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const sameDay = await this.prisma.reservation.findFirst({
      where: {
        clientId: dto.clientId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: {
          in: [
            RESERVATION_STATUS.PENDING,
            RESERVATION_STATUS.STYLIST_REVIEW,
            ...SLOT_OCCUPYING_STATUSES,
          ] as any,
        },
      },
      select: { id: true },
    });
    if (sameDay) {
      throw new BadRequestException(
        'Klijent već ima aktivnu rezervaciju za odabrani dan.',
      );
    }
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
        startTime: { lt: dto.endTime },
        endTime: { gt: dto.startTime },
      },
      select: { id: true, startTime: true, endTime: true },
    });
    if (conflict) {
      throw new BadRequestException(
        `Preklapanje sa drugim terminom (${conflict.startTime}–${conflict.endTime}).`,
      );
    }
    const primaryServiceId = serviceIds[0]!;
    const { publicReferenceCode, clientViewToken } =
      await this.shared.allocateReservationPublicCodes(reservationDate);
    const created = await this.prisma.reservation.create({
      data: {
        clientId: dto.clientId,
        serviceId: primaryServiceId,
        reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: RESERVATION_STATUS.CONFIRMED,
        clientNotes: dto.clientNotes,
        bookingOrigin,
        acceptanceMode: RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED,
        createdByUserId: actorUserId,
        confirmedStylistId: stylistProfileId,
        attendanceWaivedAt: new Date(),
        attendanceWaivedByUserId: actorUserId,
        attendanceConfirmedBy: ATTENDANCE_CONFIRMED_BY.STAFF,
        publicReferenceCode,
        clientViewToken,
      },
    });
    await this.prisma.reservationServiceItem.createMany({
      data: services.map((service, index) => ({
        reservationId: created.id,
        serviceId: service.id,
        sortOrder: index,
      })),
    });
    const full = await this.queries.findOne(created.id, {
      sub: actorUserId,
      roles: actorRoles,
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: primaryServiceId,
      serviceIds,
      date: dto.reservationDate,
    });
    return full;
  }
}
