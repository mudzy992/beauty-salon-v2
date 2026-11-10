import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationOutboxService } from './reservation-outbox.service';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { StylistDirectCreateReservationDto } from './dto/stylist-direct-create-reservation.dto';
import {
  ATTENDANCE_CONFIRMED_BY,
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_ATTENDANCE_POLICY,
  RESERVATION_BOOKING_ORIGIN,
  RESERVATION_STATUS,
} from './constants';
import { timeToMinutes } from './utils/time-slot.utils';
import { assertAdminSlotWithinWorkingHours } from './utils/assert-admin-working-hours';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';
import { buildBookableServiceWhere } from './utils/service-eligibility';
import { acquireReservationDayLock } from './utils/booking-advisory-lock';
import { assertStylistSlotCapacity } from './utils/assert-stylist-slot-capacity';
import { assertReservationServiceItemLimit } from './utils/reservation-service-limits';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class ReservationDirectCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
    private readonly outbox: ReservationOutboxService,
  ) {}

  async createByAdmin(dto: AdminCreateReservationDto, userId: string) {
    const stylistProfileId = dto.stylistProfileId?.trim();
    if (!stylistProfileId) {
      throw new BadRequestException(apiError('RESERVATIONS_STYLIST_REQUIRED'));
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
      throw new ForbiddenException(apiError('RESERVATIONS_NO_STYLIST_PROFILE'));
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
      | 'clientId'
      | 'clientNotes'
      | 'endTime'
      | 'reservationDate'
      | 'serviceId'
      | 'serviceIds'
      | 'startTime'
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
    const serviceIdsRaw =
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : dto.serviceId
          ? [dto.serviceId]
          : [];
    assertReservationServiceItemLimit(serviceIdsRaw);
    const serviceIds = [
      ...new Set(serviceIdsRaw.map((value) => value.trim()).filter(Boolean)),
    ];
    const primaryServiceId = serviceIds[0];
    if (!primaryServiceId) {
      throw new BadRequestException(apiError('RESERVE_SERVICE_REQUIRED'));
    }

    const reservationDate = this.dates.parseDateOnly(dto.reservationDate);
    if (timeToMinutes(dto.endTime) <= timeToMinutes(dto.startTime)) {
      throw new BadRequestException(apiError('RESERVATIONS_END_BEFORE_START'),
      );
    }
    const reservationDateString =
      this.dates.toDateOnlyString(reservationDate);

    const created = await this.prisma.$transaction(async (tx) => {
      await acquireReservationDayLock(tx, reservationDate);

      const client = await this.shared.getClientForReservation(
        dto.clientId,
        {
          ignoreMustChangePassword: true,
          relaxContactRequirements: true,
        },
        tx,
      );
      const services = await tx.service.findMany({
        where: buildBookableServiceWhere(serviceIds),
        select: { id: true, name: true, gender: true, price: true },
      });
      if (services.length !== serviceIds.length) {
        throw new NotFoundException(apiError('RESERVE_SERVICE_UNAVAILABLE'));
      }
      if (services.some((service) => service.gender !== client.gender)) {
        throw new BadRequestException(apiError('RESERVE_SERVICE_GENDER_MISMATCH'));
      }

      const eligibleStylists =
        await this.shared.getEligibleStylistsForServices(serviceIds, tx);
      if (!eligibleStylists.includes(stylistProfileId)) {
        throw new BadRequestException(apiError('RESERVATIONS_STYLIST_CANNOT_PERFORM_SERVICES'),
        );
      }

      await assertAdminSlotWithinWorkingHours({
        prisma: tx,
        reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        confirmedStylistId: stylistProfileId,
      });
      await assertClientDayBookingAllowed({
        prisma: tx,
        clientId: dto.clientId,
        reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        serviceIds,
      });

      await assertStylistSlotCapacity({
        db: tx,
        serviceIds,
        date: reservationDateString,
        startTime: dto.startTime,
        endTime: dto.endTime,
        stylistProfileId,
      });

      const { publicReferenceCode, clientViewToken } =
        await this.shared.allocateReservationPublicCodes(reservationDate, tx);
      const reservation = await tx.reservation.create({
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
      await tx.reservationServiceItem.createMany({
        data: services.map((service, index) => ({
          reservationId: reservation.id,
          serviceId: service.id,
          sortOrder: index,
        })),
      });

      const outboxEvent = await tx.outboxEvent.create({
        data: {
          eventType: 'reservation.created',
          aggregateId: reservation.id,
          dedupeKey: `reservation:${reservation.id}:created`,
          payload: {
            reservationId: reservation.id,
            actor: {
              sub: actorUserId,
              username: '',
              email: '',
              roles: actorRoles,
            },
            notifyUserIds: [],
            notificationTitle: '',
            notificationBody: '',
            serviceId: primaryServiceId,
            serviceIds,
            reservationDate: reservationDateString,
            emitToAdmins: true,
            emitToStylists: false,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return { reservationId: reservation.id, outboxEventId: outboxEvent.id };
    });

    await this.outbox.dispatchAfterCommit(created.outboxEventId);
    return this.queries.findOne(created.reservationId, {
      sub: actorUserId,
      roles: actorRoles,
      username: '',
      email: '',
    });
  }
}
