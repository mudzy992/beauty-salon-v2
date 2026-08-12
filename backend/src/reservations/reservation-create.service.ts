import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';

@Injectable()
export class ReservationCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly loyalty: LoyaltyService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async create(
    dto: CreateReservationDto,
    clientId: string,
    opts?: { ignoreMustChangePassword?: boolean },
  ) {
    const client = await this.shared.getClientForReservation(clientId, opts);
    const serviceIdsRaw =
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : dto.serviceId
          ? [dto.serviceId]
          : [];
    const serviceIds = [
      ...new Set(serviceIdsRaw.map((x) => x.trim()).filter(Boolean)),
    ];
    if (serviceIds.length === 0)
      throw new BadRequestException('SERVICE_REQUIRED');
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        name: true,
        gender: true,
        durationMinutes: true,
        price: true,
        loyaltyEnabled: true,
        loyaltyMaxDiscountPercent: true,
      },
    });
    if (services.length !== serviceIds.length)
      throw new NotFoundException('Servis nije pronađen.');
    if (services.some((s) => s.gender !== client.gender))
      throw new BadRequestException('SERVICE_GENDER_MISMATCH');
    const primaryServiceId = serviceIds[0]!;
    await this.shared.checkClientPenalty(clientId);
    const slots = await this.availability.getAvailableSlots(
      serviceIds,
      dto.reservationDate,
    );
    const match = slots.find(
      (s) => s.startTime === dto.startTime && s.endTime === dto.endTime,
    );
    if (!match || match.availableStylistCount === 0)
      throw new BadRequestException('Odabrani termin nije dostupan.');
    const reservationDate = new Date(dto.reservationDate);
    reservationDate.setHours(0, 0, 0, 0);
    const dayStart = new Date(reservationDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reservationDate);
    dayEnd.setHours(23, 59, 59, 999);
    const activeStatuses: string[] = [
      RESERVATION_STATUS.PENDING,
      RESERVATION_STATUS.STYLIST_REVIEW,
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
      RESERVATION_STATUS.IN_PROGRESS,
    ];
    const existingSameDay = await this.prisma.reservation.findFirst({
      where: {
        clientId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: { in: activeStatuses as any },
      },
      select: { id: true, startTime: true, status: true },
    });
    if (existingSameDay) {
      throw new BadRequestException(
        'Već imate aktivnu rezervaciju za odabrani dan. Molimo otkažite postojeću ili odaberite drugi dan.',
      );
    }
    const { publicReferenceCode, clientViewToken } =
      await this.shared.allocateReservationPublicCodes(reservationDate);
    const reservation = await this.prisma.reservation.create({
      data: {
        clientId,
        serviceId: primaryServiceId,
        reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: RESERVATION_STATUS.PENDING,
        clientNotes: dto.clientNotes,
        payDebtsIntent: !!dto.payDebtsIntent,
        publicReferenceCode,
        clientViewToken,
      },
      include: {
        service: true,
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    await this.prisma.reservationServiceItem.createMany({
      data: services.map((s, idx) => ({
        reservationId: reservation.id,
        serviceId: s.id,
        sortOrder: idx,
      })),
    });
    const stylistIds =
      await this.shared.getEligibleStylistsForServices(serviceIds);
    await this.prisma.reservationStylistResponse.createMany({
      data: stylistIds.map((stylistProfileId) => ({
        reservationId: reservation.id,
        stylistProfileId,
        status: 'PENDING',
      })),
    });
    const stylistUsers = await this.prisma.stylistProfile.findMany({
      where: { id: { in: stylistIds } },
      select: { userId: true },
    });
    const stylistUserIds = stylistUsers.map((s) => s.userId);
    if (stylistUserIds.length > 0) {
      const svcLabel =
        services.length === 1
          ? services[0]!.name
          : `${services[0]!.name} + ${services.length - 1}`;
      await this.notifications.sendToMany(
        stylistUserIds,
        'Nova rezervacija',
        `Nova rezervacija za ${svcLabel} – ${dto.reservationDate} u ${dto.startTime}.`,
        'reservation_new',
        { reservationId: reservation.id, kind: 'reservation_new' },
      );
    }
    if (dto.desiredLoyaltyPercent && dto.desiredLoyaltyPercent > 0) {
      await this.loyalty.redeemForReservation({
        clientId,
        reservationId: reservation.id,
        serviceIds,
        desiredPercent: dto.desiredLoyaltyPercent,
      });
    }
    const full = await this.queries.findOne(reservation.id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: primaryServiceId,
      serviceIds,
      date: dto.reservationDate,
    });
    return full;
  }

  async createByAdmin(dto: AdminCreateReservationDto) {
    return this.create(
      {
        serviceId: dto.serviceId,
        serviceIds: dto.serviceIds,
        reservationDate: dto.reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        clientNotes: dto.clientNotes,
      },
      dto.clientId,
      { ignoreMustChangePassword: true },
    );
  }
}
