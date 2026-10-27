import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationOutboxService } from './reservation-outbox.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { RESERVATION_STATUS } from './constants';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';
import { buildBookableServiceWhere } from './utils/service-eligibility';
import {
  acquireReservationDayLock,
  acquireReservationIdempotencyLock,
} from './utils/booking-advisory-lock';

@Injectable()
export class ReservationCreateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly loyalty: LoyaltyService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
    private readonly outbox: ReservationOutboxService,
  ) {}

  private buildIdempotencyRequestHash(
    dto: CreateReservationDto,
    serviceIds: string[],
    reservationDate: string,
  ): string {
    const canonicalRequest = JSON.stringify({
      serviceIds,
      reservationDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      clientNotes: dto.clientNotes ?? null,
      desiredLoyaltyPercent: dto.desiredLoyaltyPercent ?? 0,
      payDebtsIntent: dto.payDebtsIntent === true,
    });
    return createHash('sha256').update(canonicalRequest).digest('hex');
  }

  async create(
    dto: CreateReservationDto,
    clientId: string,
    opts?: {
      ignoreMustChangePassword?: boolean;
      idempotencyKey?: string;
    },
  ) {
    const idempotencyKey = opts?.idempotencyKey?.trim();
    if (idempotencyKey && !isUUID(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key mora biti validan UUID.');
    }

    const serviceIdsRaw =
      dto.serviceIds && dto.serviceIds.length > 0
        ? dto.serviceIds
        : dto.serviceId
          ? [dto.serviceId]
          : [];
    const serviceIds = [
      ...new Set(serviceIdsRaw.map((x) => x.trim()).filter(Boolean)),
    ];
    const primaryServiceId = serviceIds[0];
    const reservationDate = this.dates.parseDateOnly(dto.reservationDate);
    const reservationDateString =
      this.dates.toDateOnlyString(reservationDate);
    const idempotencyRequestHash = idempotencyKey
      ? this.buildIdempotencyRequestHash(dto, serviceIds, reservationDateString)
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      if (idempotencyKey && idempotencyRequestHash) {
        await acquireReservationIdempotencyLock(tx, clientId, idempotencyKey);
        const previous = await tx.reservation.findUnique({
          where: {
            clientId_idempotencyKey: { clientId, idempotencyKey },
          },
          select: { id: true, idempotencyRequestHash: true },
        });
        if (previous) {
          if (previous.idempotencyRequestHash !== idempotencyRequestHash) {
            throw new ConflictException(
              'Idempotency-Key je već korišten za drugačiji zahtjev.',
            );
          }
          const pendingEvent = await tx.outboxEvent.findUnique({
            where: { dedupeKey: `reservation:${previous.id}:created` },
            select: { id: true, status: true },
          });
          return {
            reservationId: previous.id,
            outboxEventId:
              pendingEvent?.status === 'PENDING' ? pendingEvent.id : null,
            replayed: true,
          };
        }
      }

      if (!primaryServiceId) {
        throw new BadRequestException('SERVICE_REQUIRED');
      }

      await acquireReservationDayLock(tx, reservationDate);
      const client = await this.shared.getClientForReservation(
        clientId,
        { ignoreMustChangePassword: opts?.ignoreMustChangePassword },
        tx,
      );
      const services = await tx.service.findMany({
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
      if (services.length !== serviceIds.length) {
        throw new NotFoundException('Servis nije pronađen.');
      }
      if (services.some((service) => service.gender !== client.gender)) {
        throw new BadRequestException('SERVICE_GENDER_MISMATCH');
      }

      await this.shared.checkClientPenalty(clientId, tx);

      const slots = await this.availability.getAvailableSlots(
        serviceIds,
        reservationDateString,
        tx,
      );
      const match = slots.find(
        (slot) =>
          slot.startTime === dto.startTime && slot.endTime === dto.endTime,
      );
      if (!match || match.availableStylistCount === 0) {
        throw new BadRequestException('Odabrani termin nije dostupan.');
      }

      await assertClientDayBookingAllowed({
        prisma: tx,
        clientId,
        reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        serviceIds,
      });

      const stylistIds = await this.shared.getEligibleStylistsForServices(
        serviceIds,
        tx,
      );
      if (stylistIds.length === 0) {
        throw new BadRequestException('Odabrani termin nije dostupan.');
      }
      const stylistUsers = await tx.stylistProfile.findMany({
        where: { id: { in: stylistIds } },
        select: { userId: true },
      });

      const { publicReferenceCode, clientViewToken } =
        await this.shared.allocateReservationPublicCodes(reservationDate, tx);
      const reservation = await tx.reservation.create({
        data: {
          clientId,
          serviceId: primaryServiceId,
          reservationDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: RESERVATION_STATUS.PENDING,
          clientNotes: dto.clientNotes,
          payDebtsIntent: !!dto.payDebtsIntent,
          idempotencyKey: idempotencyKey ?? null,
          idempotencyRequestHash,
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
      await tx.reservationStylistResponse.createMany({
        data: stylistIds.map((stylistProfileId) => ({
          reservationId: reservation.id,
          stylistProfileId,
          status: 'PENDING',
        })),
      });

      if (dto.desiredLoyaltyPercent && dto.desiredLoyaltyPercent > 0) {
        await this.loyalty.redeemForReservation(
          {
            clientId,
            reservationId: reservation.id,
            serviceIds,
            desiredPercent: dto.desiredLoyaltyPercent,
          },
          tx,
        );
      }

      const serviceLabel =
        services.length === 1
          ? services[0]!.name
          : `${services[0]!.name} + ${services.length - 1}`;
      const outboxEvent = await tx.outboxEvent.create({
        data: {
          eventType: 'reservation.created',
          aggregateId: reservation.id,
          dedupeKey: `reservation:${reservation.id}:created`,
          payload: {
            reservationId: reservation.id,
            actor: {
              sub: clientId,
              username: '',
              email: '',
              roles: ['CLIENT'],
            },
            notifyUserIds: stylistUsers.map((stylist) => stylist.userId),
            notificationTitle: 'Nova rezervacija',
            notificationBody: `Nova rezervacija za ${serviceLabel} – ${reservationDateString} u ${dto.startTime}.`,
            serviceId: primaryServiceId,
            serviceIds,
            reservationDate: reservationDateString,
            emitToAdmins: true,
            emitToStylists: true,
          } satisfies Prisma.InputJsonObject,
        },
      });

      return {
        reservationId: reservation.id,
        outboxEventId: outboxEvent.id,
        replayed: false,
      };
    });

    if (result.outboxEventId) {
      await this.outbox.dispatchAfterCommit(result.outboxEventId);
    }

    return this.queries.findOne(result.reservationId, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
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
