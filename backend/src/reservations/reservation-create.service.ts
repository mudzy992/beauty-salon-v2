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
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';
import { buildBookableServiceWhere } from './utils/service-eligibility';

@Injectable()
export class ReservationCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly loyalty: LoyaltyService,
    private readonly dates: ReservationDateService,
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
    const initialServices = await this.prisma.service.findMany({
      where: buildBookableServiceWhere(serviceIds),
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
    if (initialServices.length !== serviceIds.length)
      throw new NotFoundException('Servis nije pronađen.');
    if (initialServices.some((s) => s.gender !== client.gender))
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
    const reservationDate = this.dates.parseDateOnly(dto.reservationDate);
    await assertClientDayBookingAllowed({
      prisma: this.prisma,
      clientId,
      reservationDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      serviceIds,
    });
    const { publicReferenceCode, clientViewToken } =
      await this.shared.allocateReservationPublicCodes(reservationDate);
    const { reservation, services, stylistIds } =
      await this.prisma.$transaction(async (tx) => {
        const currentServices = await tx.service.findMany({
          where: buildBookableServiceWhere(serviceIds),
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
        if (currentServices.length !== serviceIds.length) {
          throw new NotFoundException('Servis nije pronađen.');
        }
        if (currentServices.some((s) => s.gender !== client.gender)) {
          throw new BadRequestException('SERVICE_GENDER_MISMATCH');
        }

        const currentStylistIds =
          await this.shared.getEligibleStylistsForServices(serviceIds, tx);
        if (currentStylistIds.length === 0) {
          throw new BadRequestException('Odabrani termin nije dostupan.');
        }

        const createdReservation = await tx.reservation.create({
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
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });
        await tx.reservationServiceItem.createMany({
          data: currentServices.map((s, idx) => ({
            reservationId: createdReservation.id,
            serviceId: s.id,
            sortOrder: idx,
          })),
        });
        await tx.reservationStylistResponse.createMany({
          data: currentStylistIds.map((stylistProfileId) => ({
            reservationId: createdReservation.id,
            stylistProfileId,
            status: 'PENDING',
          })),
        });
        return {
          reservation: createdReservation,
          services: currentServices,
          stylistIds: currentStylistIds,
        };
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
