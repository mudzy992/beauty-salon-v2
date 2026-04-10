import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { StylistRejectDto } from './dto/stylist-respond.dto';
import type { StylistNoShowDto } from './dto/stylist-no-show.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  RESERVATION_STATUS,
  RESERVATION_TRANSITIONS,
  type ReservationStatus,
} from './constants';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { minutesToTime, timeToMinutes } from './utils/time-slot.utils';
import { ReservationDateService } from './reservation-date.service';

type RescheduleMode = 'actual_overrun' | 'manual_minutes' | 'use_break_only';
type PendingRescheduleKind = 'reservation_reschedule' | 'reservation_reorder' | null;

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly loyalty: LoyaltyService,
    private readonly dates: ReservationDateService,
  ) {}

  private isReservationBlocked(res: {
    status: string;
    rescheduleStatus: string | null;
    rescheduleProposedStartTime: string | null;
    rescheduleProposedEndTime: string | null;
  }): boolean {
    return (
      res.rescheduleStatus === 'PENDING' &&
      !!res.rescheduleProposedStartTime &&
      !!res.rescheduleProposedEndTime
    );
  }

  private computeRescheduleDeadlineMinutes(
    sentAt: Date,
    proposedStartTime: string,
    reservationDate: Date,
  ): number {
    const proposedStart = this.dates.combineDateAndTime(
      reservationDate,
      proposedStartTime,
    );
    const minutesUntil = Math.max(
      1,
      Math.floor((proposedStart.getTime() - sentAt.getTime()) / 60000),
    );
    return Math.max(1, Math.min(30, Math.floor(minutesUntil * 0.5)));
  }

  private async getPendingRescheduleKind(
    reservationId: string,
  ): Promise<PendingRescheduleKind> {
    const latest = await this.prisma.notification.findFirst({
      where: {
        type: { in: ['reservation_reschedule', 'reservation_reminder'] as any },
        data: {
          path: '$.reservationId',
          equals: reservationId,
        },
      },
      orderBy: { sentAt: 'desc' },
      select: { type: true, data: true },
    });
    const kind =
      latest?.data &&
      typeof latest.data === 'object' &&
      (latest.data as Record<string, unknown>).kind;
    if (kind === 'reservation_reorder') return 'reservation_reorder';
    if (kind === 'reservation_reschedule') return 'reservation_reschedule';
    return null;
  }

  private async notifyStylistAboutClientDecision(
    reservationId: string,
    decision: 'accepted' | 'declined' | 'timeout_cancelled',
  ) {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        confirmedStylist: {
          select: { userId: true },
        },
        service: {
          select: { name: true },
        },
      },
    });
    const stylistUserId = reservation?.confirmedStylist?.userId;
    if (!stylistUserId) return;

    const title =
      decision === 'accepted'
        ? 'Klijent potvrdio novi termin'
        : decision === 'declined'
          ? 'Klijent odbio novi termin'
          : 'Termin auto-otkazan';
    const body =
      decision === 'accepted'
        ? `Klijent je potvrdio novi termin za ${reservation?.service?.name ?? 'uslugu'}.`
        : decision === 'declined'
          ? `Klijent je odbio predloženi termin za ${reservation?.service?.name ?? 'uslugu'}.`
          : `Klijent nije odgovorio na vrijeme. Termin je auto-otkazan.`;

    await this.notifications.send({
      userId: stylistUserId,
      title,
      body,
      type: 'reservation_reminder',
      data: { reservationId, kind: 'stylist_reschedule_decision', decision },
      channel: 'PUSH',
    });
  }

  async create(dto: CreateReservationDto, clientId: string) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        email: true,
        phone: true,
        gender: true,
        isEmailVerified: true,
        mustChangePassword: true,
      },
    });
    if (!client) throw new NotFoundException('Korisnik nije pronađen.');
    if (client.mustChangePassword) {
      throw new BadRequestException('MUST_CHANGE_PASSWORD');
    }
    if (!client.email) {
      throw new BadRequestException('EMAIL_REQUIRED');
    }
    if (!client.phone) {
      throw new BadRequestException('PHONE_REQUIRED');
    }
    if (!client.isEmailVerified) {
      throw new BadRequestException('EMAIL_NOT_VERIFIED');
    }
    if (!client.gender) {
      throw new BadRequestException('GENDER_REQUIRED');
    }
    const selectedService = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      select: { id: true, gender: true },
    });
    if (!selectedService) {
      throw new NotFoundException('Servis nije pronađen.');
    }
    if (selectedService.gender !== client.gender) {
      throw new BadRequestException('SERVICE_GENDER_MISMATCH');
    }
    await this.checkClientPenalty(clientId);
    const slots = await this.availability.getAvailableSlots(
      dto.serviceId,
      dto.reservationDate,
    );
    const match = slots.find(
      (s) => s.startTime === dto.startTime && s.endTime === dto.endTime,
    );
    if (!match || match.availableStylistCount === 0) {
      throw new BadRequestException('Odabrani termin nije dostupan.');
    }

    const reservationDate = new Date(dto.reservationDate);
    reservationDate.setHours(0, 0, 0, 0);

    // Guard: klijent ne može imati više od jedne aktivne rezervacije na isti dan.
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

    const reservation = await this.prisma.reservation.create({
      data: {
        clientId,
        serviceId: dto.serviceId,
        reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: RESERVATION_STATUS.PENDING,
        clientNotes: dto.clientNotes,
      },
      include: {
        service: true,
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const stylistIds = await this.prisma.stylistService
      .findMany({
        where: { serviceId: dto.serviceId },
        select: { stylistProfileId: true },
      })
      .then((r) => r.map((x) => x.stylistProfileId));

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
      await this.notifications.sendToMany(
        stylistUserIds,
        'Nova rezervacija',
        `Nova rezervacija za ${reservation.service.name} – ${dto.reservationDate} u ${dto.startTime}.`,
        'reservation_new',
        { reservationId: reservation.id },
      );
    }

    // Ako je klijent odabrao korištenje bodova (preko procenta popusta), pokušaj redeem sa svim pravilima.
    if (dto.desiredLoyaltyPercent && dto.desiredLoyaltyPercent > 0) {
      await this.loyalty.redeemForReservation({
        clientId,
        reservationId: reservation.id,
        serviceId: reservation.serviceId,
        desiredPercent: dto.desiredLoyaltyPercent,
      });
    }

    const full = await this.findOne(reservation.id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: dto.serviceId,
      date: dto.reservationDate,
    });
    return full;
  }

  async createByAdmin(dto: AdminCreateReservationDto) {
    return this.create(
      {
        serviceId: dto.serviceId,
        reservationDate: dto.reservationDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        clientNotes: dto.clientNotes,
      },
      dto.clientId,
    );
  }

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
      },
    });
    if (!existing) throw new NotFoundException('Rezervacija nije pronađena.');
    const nextDate = dto.reservationDate
      ? this.dates.parseDateOnly(dto.reservationDate)
      : this.dates.parseDateOnly(existing.reservationDate);
    const nextStartTime = (dto.startTime ?? existing.startTime).trim();
    const nextEndTime = (dto.endTime ?? existing.endTime).trim();
    if (!nextStartTime || !nextEndTime) {
      throw new BadRequestException('Neispravno vrijeme termina.');
    }
    if (timeToMinutes(nextEndTime) <= timeToMinutes(nextStartTime)) {
      throw new BadRequestException('Vrijeme završetka mora biti nakon početka.');
    }
    const stylistId = existing.confirmedStylistId;
    if (stylistId) {
      const dayStart = new Date(nextDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(nextDate);
      dayEnd.setHours(23, 59, 59, 999);
      const conflict = await this.prisma.reservation.findFirst({
        where: {
          id: { not: existing.id },
          confirmedStylistId: stylistId,
          reservationDate: { gte: dayStart, lte: dayEnd },
          status: {
            in: [
              RESERVATION_STATUS.CONFIRMED,
              RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
              RESERVATION_STATUS.IN_PROGRESS,
            ] as any,
          },
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
    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        reservationDate: nextDate,
        startTime: nextStartTime,
        endTime: nextEndTime,
      },
    });
    const full = await this.findOne(updated.id, {
      sub: '',
      roles: ['SYSTEM_ADMIN'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, full);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: existing.serviceId,
      date: this.dates.toLocalDateOnlyString(nextDate),
    });
    return full;
  }

  async findAll(
    query: {
      fromDate?: string;
      toDate?: string;
      status?: string;
      asClient?: boolean;
      asStylist?: boolean;
      page?: number;
      pageSize?: number;
    },
    user: CurrentUserPayload,
  ) {
    const where: {
      reservationDate?: { gte?: Date; lte?: Date };
      status?: string;
      clientId?: string;
      OR?: Array<{
        confirmedStylistId?: string;
        stylistResponses?: { some: { stylistProfileId: string } };
      }>;
    } = {};
    if (query.fromDate) {
      where.reservationDate = {
        ...where.reservationDate,
        gte: new Date(query.fromDate),
      };
    }
    if (query.toDate) {
      where.reservationDate = {
        ...where.reservationDate,
        lte: new Date(query.toDate),
      };
    }
    if (query.status) where.status = query.status;
    if (query.asClient) where.clientId = user.sub;
    if (query.asStylist) {
      const stylistProfileId = await this.getStylistProfileIdByUserId(user.sub);
      if (stylistProfileId) {
        where.OR = [
          { confirmedStylistId: stylistProfileId },
          { stylistResponses: { some: { stylistProfileId } } },
        ];
      }
    }

    const include = {
      service: {
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          price: true,
          heroImage: true,
        },
      },
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          cancellationCount: {
            select: { cancellationCount: true, penaltyUntil: true },
            take: 1,
          },
        },
      },
      confirmedStylist: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      stylistResponses: {
        include: {
          stylistProfile: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    } as const;
    const hasPagination = query.page != null && query.pageSize != null;
    if (!hasPagination) {
      return this.prisma.reservation.findMany({
        where,
        include,
        orderBy: [{ reservationDate: 'asc' }, { startTime: 'asc' }],
      });
    }
    const page = Math.max(0, query.page ?? 0);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
    const [items, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        include,
        orderBy: [{ reservationDate: 'asc' }, { startTime: 'asc' }],
        skip: page * pageSize,
        take: pageSize,
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        service: { include: { subcategory: { include: { category: true } } } },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        confirmedStylist: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        stylistResponses: {
          include: {
            stylistProfile: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    const stylistProfileId = await this.getStylistProfileIdByUserId(user.sub);
    const canAccess =
      r.clientId === user.sub ||
      r.confirmedStylistId === stylistProfileId ||
      r.stylistResponses.some((sr) => sr.stylistProfile.userId === user.sub) ||
      user.roles.includes('SYSTEM_ADMIN') ||
      user.roles.includes('OWNER');
    if (!canAccess)
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    return r;
  }

  async cancelByClient(
    id: string,
    clientId: string,
    dto?: CancelReservationDto,
  ) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== clientId)
      throw new ForbiddenException('Samo klijent može otkazati rezervaciju.');
    const cancellableStatuses: string[] = [
      RESERVATION_STATUS.PENDING,
      RESERVATION_STATUS.STYLIST_REVIEW,
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
    ];
    if (!cancellableStatuses.includes(r.status)) {
      throw new BadRequestException('Rezervacija se više ne može otkazati.');
    }

    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const deadline = new Date(r.reservationDate);
    deadline.setHours(0, 0, 0, 0);
    deadline.setHours(deadline.getHours() - salon.cancellationDeadlineHours);
    if (new Date() > deadline) {
      throw new BadRequestException('Rok za otkazivanje je istekao.');
    }

    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: RESERVATION_STATUS.CANCELLED_BY_CLIENT,
        cancelledAt: new Date(),
        cancelReason: dto?.cancelReason,
      },
    });

    await this.incrementCancellationCount(clientId, salon);
    const cancelled = await this.findOne(id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: r.reservationDate,
    });
    return cancelled;
  }

  async cancelByAdmin(id: string, dto?: CancelReservationDto) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.status === RESERVATION_STATUS.COMPLETED) {
      throw new BadRequestException('Završena rezervacija se ne može otkazati.');
    }
    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
        cancelledAt: new Date(),
        cancelReason: dto?.cancelReason,
      },
    });
    const cancelled = await this.findOne(id, {
      sub: '',
      roles: ['SYSTEM_ADMIN'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: r.reservationDate,
    });
    return cancelled;
  }

  async confirmAttendance(id: string, clientId: string) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== clientId)
      throw new ForbiddenException('Samo klijent može potvrditi dolazak.');
    if (r.status !== RESERVATION_STATUS.CONFIRMED) {
      throw new BadRequestException(
        'Rezervacija mora biti potvrđena od strane stilista.',
      );
    }

    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const minConfirmTime = new Date(r.reservationDate);
    minConfirmTime.setHours(0, 0, 0, 0);
    minConfirmTime.setHours(
      minConfirmTime.getHours() - salon.cancellationDeadlineHours,
    );
    if (new Date() < minConfirmTime) {
      throw new BadRequestException(
        'Dolazak se može potvrditi najranije 24h prije termina.',
      );
    }

    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        attendanceConfirmedAt: new Date(),
      },
    });
    const confirmed = await this.findOne(id, {
      sub: clientId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, confirmed);
    return confirmed;
  }

  async stylistLock(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
  ) {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const lockMinutes = salon.reservationLockMinutes;

    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
    if (
      res.status !== RESERVATION_STATUS.PENDING &&
      res.status !== RESERVATION_STATUS.STYLIST_REVIEW
    ) {
      throw new BadRequestException(
        'Rezervacija nije u fazi odgovora stilista.',
      );
    }

    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId)
      throw new ForbiddenException(
        'Možete raditi samo na vlastitom profilu stilista.',
      );

    const response = await this.prisma.reservationStylistResponse.findUnique({
      where: {
        reservationId_stylistProfileId: { reservationId, stylistProfileId },
      },
    });
    if (!response)
      throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
    if (
      response.status === 'LOCKED' &&
      response.lockExpiresAt &&
      new Date() < response.lockExpiresAt
    ) {
      return this.findOne(reservationId, {
        sub: userId,
        roles: ['STYLIST'],
        username: '',
        email: '',
      });
    }
    if (response.status === 'ACCEPTED' || response.status === 'REJECTED') {
      throw new BadRequestException('Već ste odgovorili na ovu rezervaciju.');
    }

    const now = new Date();
    const lockExpiresAt = new Date(now.getTime() + lockMinutes * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.reservationStylistResponse.updateMany({
        where: { reservationId },
        data: { status: 'PENDING', lockedAt: null, lockExpiresAt: null },
      }),
      this.prisma.reservationStylistResponse.update({
        where: {
          reservationId_stylistProfileId: { reservationId, stylistProfileId },
        },
        data: { status: 'LOCKED', lockedAt: now, lockExpiresAt },
      }),
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: RESERVATION_STATUS.STYLIST_REVIEW },
      }),
    ]);

    const locked = await this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE,
      locked,
    );
    this.events.emitToUser(
      res.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      locked,
    );
    return locked;
  }

  async stylistAccept(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
  ) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId)
      throw new ForbiddenException(
        'Možete raditi samo na vlastitom profilu stilista.',
      );

    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');

    const response = res.stylistResponses.find(
      (r) => r.stylistProfileId === stylistProfileId,
    );
    if (!response)
      throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
    if (response.status !== 'LOCKED') {
      throw new BadRequestException('Prvo zaključajte rezervaciju (lock).');
    }
    if (response.lockExpiresAt && new Date() > response.lockExpiresAt) {
      throw new BadRequestException('Lock je istekao. Zaključajte ponovo.');
    }

    await this.prisma.$transaction([
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: RESERVATION_STATUS.CONFIRMED,
          confirmedStylistId: stylistProfileId,
        },
      }),
      this.prisma.reservationStylistResponse.update({
        where: {
          reservationId_stylistProfileId: { reservationId, stylistProfileId },
        },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
      this.prisma.reservationStylistResponse.updateMany({
        where: {
          reservationId,
          stylistProfileId: { not: stylistProfileId },
          status: 'LOCKED',
        },
        data: { status: 'PENDING', lockedAt: null, lockExpiresAt: null },
      }),
    ]);

    const resWithClient = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        clientId: true,
        service: { select: { name: true } },
        reservationDate: true,
        startTime: true,
      },
    });
    if (resWithClient?.clientId) {
      await this.notifications.send({
        userId: resWithClient.clientId,
        title: 'Rezervacija potvrđena',
        body: `Vaša rezervacija za ${resWithClient.service.name} je potvrđena.`,
        type: 'reservation_confirmed',
        data: { reservationId },
      });
    }

    const accepted = await this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CONFIRMED, accepted);
    if (resWithClient?.clientId) {
      this.events.emitToUser(
        resWithClient.clientId,
        SOCKET_EVENTS.RESERVATION_CONFIRMED,
        accepted,
      );
    }
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: accepted.serviceId,
      date: accepted.reservationDate,
    });
    return accepted;
  }

  async stylistReject(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
    dto?: StylistRejectDto,
  ) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId)
      throw new ForbiddenException(
        'Možete raditi samo na vlastitom profilu stilista.',
      );

    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');

    const response = res.stylistResponses.find(
      (r) => r.stylistProfileId === stylistProfileId,
    );
    if (!response)
      throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
    if (response.status !== 'LOCKED' && response.status !== 'PENDING') {
      throw new BadRequestException('Već ste odgovorili.');
    }

    await this.prisma.reservationStylistResponse.update({
      where: {
        reservationId_stylistProfileId: { reservationId, stylistProfileId },
      },
      data: {
        status: 'REJECTED',
        rejectionReason: dto?.rejectionReason,
        respondedAt: new Date(),
      },
    });

    const stillPendingOrLocked = res.stylistResponses.filter(
      (r) =>
        r.stylistProfileId !== stylistProfileId &&
        (r.status === 'PENDING' ||
          (r.status === 'LOCKED' &&
            r.lockExpiresAt &&
            new Date() < r.lockExpiresAt)),
    );
    if (stillPendingOrLocked.length === 0) {
      await this.prisma.reservation.update({
        where: { id: reservationId },
        data: {
          status: RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
          cancelledAt: new Date(),
          cancelReason: 'Svi stilisti su odbili rezervaciju.',
        },
      });
      const resWithClient = await this.prisma.reservation.findUnique({
        where: { id: reservationId },
        select: { clientId: true },
      });
      if (resWithClient?.clientId) {
        await this.notifications.send({
          userId: resWithClient.clientId,
          title: 'Rezervacija otkazana',
          body: 'Rezervacija je otkazana jer nijedan stilist nije mogao prihvatiti termin.',
          type: 'reservation_cancelled',
          data: { reservationId },
        });
      }
    }

    const result = await this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE,
      result,
    );
    if (stillPendingOrLocked.length === 0) {
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: res.serviceId,
        date: res.reservationDate,
      });
    }
    return result;
  }

  private async checkClientPenalty(clientId: string) {
    const rec = await this.prisma.clientCancellationCount.findUnique({
      where: { userId: clientId },
    });
    if (rec?.penaltyUntil && new Date() < rec.penaltyUntil) {
      throw new BadRequestException(
        `Zbog čestih otkazivanja rezervacija je onemogućena do ${this.dates.toLocalDateOnlyString(rec.penaltyUntil)}.`,
      );
    }
  }

  private async incrementCancellationCount(
    clientId: string,
    salon: {
      maxCancellationsBeforePenalty: number;
      penaltyDurationDays: number;
    },
  ) {
    const existing = await this.prisma.clientCancellationCount.findUnique({
      where: { userId: clientId },
    });
    const count = (existing?.cancellationCount ?? 0) + 1;
    let penaltyUntil: Date | null = null;
    if (count >= salon.maxCancellationsBeforePenalty) {
      penaltyUntil = new Date();
      penaltyUntil.setDate(penaltyUntil.getDate() + salon.penaltyDurationDays);
    }
    await this.prisma.clientCancellationCount.upsert({
      where: { userId: clientId },
      create: { userId: clientId, cancellationCount: count, penaltyUntil },
      update: { cancellationCount: count, penaltyUntil },
    });
  }

  /** Stilist označava rezervaciju kao završenu (nakon što je upisao u dnevnu knjigu). */
  async stylistMarkComplete(reservationId: string, userId: string) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može označiti rezervaciju kao završenu.',
      );
    }
    if (
      r.status !== RESERVATION_STATUS.ATTENDANCE_CONFIRMED &&
      r.status !== RESERVATION_STATUS.IN_PROGRESS
    ) {
      throw new BadRequestException(
        'Samo rezervacije s potvrđenim dolaskom klijenta mogu se označiti završenim.',
      );
    }
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: RESERVATION_STATUS.COMPLETED },
    });
    // Minimalna Loyalty implementacija:
    // ako je program uključen, osiguraj da klijent ima loyalty račun.
    await this.loyalty.ensureAccountForUser(r.clientId);
    return this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
  }

  /** Stilist startuje rezervaciju (ATTENDANCE_CONFIRMED -> IN_PROGRESS). */
  async stylistStart(reservationId: string, userId: string) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');

    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može startovati ovu rezervaciju.',
      );
    }
    if (r.status !== RESERVATION_STATUS.ATTENDANCE_CONFIRMED) {
      throw new BadRequestException(
        'Samo rezervacije s potvrđenim dolaskom klijenta mogu se startovati.',
      );
    }

    const now = new Date();
    const plannedStart = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    if (now.getTime() < plannedStart.getTime()) {
      throw new BadRequestException(
        'Termin još nije počeo. Start je dozvoljen tek od planiranog vremena početka.',
      );
    }

    const dayStart = this.dates.parseDateOnly(r.reservationDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const earlierPending = await this.prisma.reservation.findFirst({
      where: {
        id: { not: r.id },
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        startTime: { lt: r.startTime },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          ] as any,
        },
      },
      select: { id: true, startTime: true, endTime: true, status: true },
      orderBy: { startTime: 'asc' },
    });
    if (earlierPending) {
      throw new BadRequestException(
        `Postoji raniji termin (${earlierPending.startTime}–${earlierPending.endTime}) koji prvo morate obraditi.`,
      );
    }
    if (
      r.rescheduleStatus === 'PENDING' &&
      r.rescheduleProposedStartTime &&
      r.rescheduleProposedEndTime
    ) {
      throw new BadRequestException(
        'Rezervacija čeka potvrdu klijenta za novi termin. Start nije dozvoljen dok se zahtjev ne riješi.',
      );
    }

    const plannedEnd = this.dates.combineDateAndTime(r.reservationDate, r.endTime);
    if (now.getTime() > plannedEnd.getTime()) {
      throw new BadRequestException(
        'Termin je probijen. Prvo odaberite akciju kašnjenja (rekalkulacija ili korištenje pauze).',
      );
    }

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: RESERVATION_STATUS.IN_PROGRESS, startedAt: now },
    });

    const updated = await this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });

    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, updated);
    this.events.emitToUser(
      r.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      updated,
    );

    return updated;
  }

  async setUseBreakAfterOverrun(
    reservationId: string,
    userId: string,
    useBreak: boolean,
  ) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');

    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, confirmedStylistId: true, status: true },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može označiti korištenje pauze.',
      );
    }
    if (r.status !== RESERVATION_STATUS.IN_PROGRESS) {
      throw new BadRequestException('Pauzu možete označiti samo dok je termin u toku.');
    }

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { useBreakAfterOverrun: useBreak, useBreakDecidedAt: new Date() },
    });
    return { ok: true };
  }

  /** Stilist otkazuje rezervaciju (CONFIRMED ili IN_PROGRESS) uz obrazloženje. */
  async stylistCancel(
    reservationId: string,
    userId: string,
    dto: { cancelReason?: string },
  ) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može otkazati ovu rezervaciju.',
      );
    }
    const cancellableByStylist = [
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.IN_PROGRESS,
    ];
    if (!cancellableByStylist.includes(r.status as any)) {
      throw new BadRequestException(
        'Samo potvrđene ili u toku rezervacije mogu se otkazati. Završene označite preko "Završi i upiši u dnevnu knjigu".',
      );
    }
    const reason = (dto?.cancelReason ?? '').trim();
    if (!reason)
      throw new BadRequestException('Obrazloženje otkazivanja je obavezno.');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    const cancelled = await this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, cancelled);
    this.events.emitToUser(
      r.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      cancelled,
    );
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: r.reservationDate,
    });
    return cancelled;
  }

  /** Stilist označava da se klijent nije pojavio (NO_SHOW). */
  async stylistMarkNoShow(
    reservationId: string,
    userId: string,
    dto: StylistNoShowDto,
  ) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId) {
      throw new ForbiddenException('Nemate profil stilista.');
    }

    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        clientId: true,
        serviceId: true,
        reservationDate: true,
        confirmedStylistId: true,
        status: true,
      },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException('Samo potvrđeni stilist može označiti no-show.');
    }

    const allowedStatuses: string[] = [
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
    ];
    if (!allowedStatuses.includes(r.status)) {
      throw new BadRequestException(
        'No-show možete označiti samo za potvrđene termine (prije startovanja).',
      );
    }

    const reason = (dto?.reason ?? '').trim();
    if (!reason) throw new BadRequestException('Obrazloženje je obavezno.');

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: RESERVATION_STATUS.NO_SHOW,
        cancelledAt: new Date(),
        cancelReason: reason,
        rescheduleStatus: null,
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
      },
    });

    if (dto?.applyPenalty !== false) {
      const salon = await this.prisma.salonSettings.findFirst();
      if (salon) {
        await this.incrementCancellationCount(r.clientId, {
          maxCancellationsBeforePenalty: salon.maxCancellationsBeforePenalty,
          penaltyDurationDays: salon.penaltyDurationDays,
        });
      }
    }

    const updated = await this.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });

    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, updated);
    this.events.emitToUser(r.clientId, SOCKET_EVENTS.RESERVATION_UPDATED, updated);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: r.serviceId,
      date: r.reservationDate,
    });

    await this.notifications.send({
      userId: r.clientId,
      title: 'No-show',
      body: 'Rezervacija je označena kao “nije se pojavio/la”. Ako je greška, kontaktirajte salon.',
      type: 'reservation_cancelled',
      data: { reservationId },
      channel: 'PUSH',
    });

    return updated;
  }

  private async getStylistProfileIdByUserId(
    userId: string,
  ): Promise<string | null> {
    const p = await this.prisma.stylistProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return p?.id ?? null;
  }

  async proposeReschedule(
    reservationId: string,
    userId: string,
    opts: {
      includeBreaks: boolean;
      mode?: RescheduleMode;
      manualShiftMinutes?: number;
    },
  ) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
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

    const plannedEnd = this.dates.combineDateAndTime(r.reservationDate, r.endTime);
    const now = new Date();
    const referenceTime = r.completedAt ?? now;
    // "Stvarni overrun" mora biti stabilan i bez timezone drift-a.
    // Primarno računamo preko lifecycle-a (startedAt -> now/completedAt - planirano trajanje),
    // a clock/timestamp ostaju fallback.
    const plannedDuration = Math.max(
      0,
      timeToMinutes(r.endTime) - timeToMinutes(r.startTime),
    );
    const lifecycleMinutes =
      r.startedAt instanceof Date
        ? Math.floor((referenceTime.getTime() - r.startedAt.getTime()) / 60000) -
          plannedDuration
        : Number.NEGATIVE_INFINITY;

    const diffByClock =
      referenceTime.getHours() * 60 +
      referenceTime.getMinutes() -
      timeToMinutes(r.endTime);
    const diffByTimestamp = Math.floor(
      (referenceTime.getTime() - plannedEnd.getTime()) / 60000,
    );
    const overrunMinutes = Math.max(0, lifecycleMinutes, diffByClock, diffByTimestamp);
    const mode = opts.mode ?? 'actual_overrun';
    const manualShift = Math.max(0, Math.floor(opts.manualShiftMinutes ?? 0));

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

    const dayStart = new Date(r.reservationDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(r.reservationDate);
    dayEnd.setHours(23, 59, 59, 999);

    const future = await this.prisma.reservation.findMany({
      where: {
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        startTime: { gt: r.startTime },
        status: { in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.ATTENDANCE_CONFIRMED] as any },
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
    const breakCount = future.length; // pauze prije svake buduće rezervacije (nakon trenutne)
    const maxAbsorb = opts.includeBreaks ? pause * breakCount : 0;
    const absorbTotal = Math.min(delayMinutes, Math.max(0, maxAbsorb));

    // Ravnomjerno skidanje vremena iz budućih pauza (svaka pauza max = pause).
    const reductions: number[] = [];
    let remaining = absorbTotal;
    for (let i = 0; i < breakCount; i++) {
      const remainingBreaks = breakCount - i;
      const target = Math.ceil(remaining / remainingBreaks);
      const take = Math.min(pause, Math.max(0, target));
      reductions.push(take);
      remaining -= take;
    }

    const items = future.map((fr, idx) => {
      const reductionUpToThis = reductions.slice(0, idx + 1).reduce((s, x) => s + x, 0);
      const shiftMinutes = Math.max(0, delayMinutes - reductionUpToThis);

      const start = timeToMinutes(fr.startTime) + shiftMinutes;
      const end = timeToMinutes(fr.endTime) + shiftMinutes;
      return {
        id: fr.id,
        clientId: fr.clientId,
        serviceName: fr.service?.name ?? '',
        clientName: fr.client ? `${fr.client.firstName ?? ''} ${fr.client.lastName ?? ''}`.trim() : '',
        oldStartTime: fr.startTime,
        oldEndTime: fr.endTime,
        newStartTime: minutesToTime(start),
        newEndTime: minutesToTime(end),
        shiftMinutes,
        reducedBreakMinutes: reductions[idx] ?? 0,
      };
    });

    const lastShift = items.length ? items[items.length - 1].shiftMinutes : 0;
    return {
      mode,
      overrunMinutes: Math.max(0, overrunMinutes),
      delayMinutes,
      shiftMinutes: lastShift,
      includeBreaks: opts.includeBreaks === true,
      items,
    };
  }

  async commitReschedule(
    reservationId: string,
    userId: string,
    opts: {
      includeBreaks: boolean;
      mode?: RescheduleMode;
      manualShiftMinutes?: number;
    },
  ) {
    const proposal = await this.proposeReschedule(reservationId, userId, opts);
    if (opts.mode === 'use_break_only') {
      await this.setUseBreakAfterOverrun(reservationId, userId, true);
      return proposal;
    }
    if (!proposal.items.length) return proposal;

    await this.prisma.$transaction(async (tx) => {
      for (const item of proposal.items) {
        await tx.reservation.update({
          where: { id: item.id },
          data: {
            rescheduleProposedStartTime: item.newStartTime,
            rescheduleProposedEndTime: item.newEndTime,
            rescheduleStatus: 'PENDING',
            useBreakAfterOverrun: opts.mode === 'use_break_only' ? true : null,
            useBreakDecidedAt: opts.mode === 'use_break_only' ? new Date() : null,
          },
        });
      }
    });

    const metaBody =
      opts.mode === 'manual_minutes'
        ? `Ručna rekalkulacija: +${Math.max(0, Math.floor(opts.manualShiftMinutes ?? 0))} min.`
        : 'Rekalkulacija na osnovu kašnjenja prethodnog termina.';

    for (const item of proposal.items) {
      const reservationDate = await this.prisma.reservation.findUnique({
        where: { id: item.id },
        select: { reservationDate: true },
      });
      const sentAt = new Date();
      const confirmIn = reservationDate
        ? this.computeRescheduleDeadlineMinutes(
            sentAt,
            item.newStartTime,
            reservationDate.reservationDate,
          )
        : 30;
      await this.notifications.send({
        userId: item.clientId,
        title: 'Promjena termina',
        body: `Vaš termin je pomjeren za ${item.shiftMinutes} min. Potvrdite dolazak u narednih ${confirmIn} min. ${metaBody}`,
        type: 'reservation_reschedule',
        data: {
          kind: 'reservation_reschedule',
          reservationId: item.id,
          mode: opts.mode ?? 'actual_overrun',
          shiftMinutes: item.shiftMinutes,
          confirmationDeadlineMinutes: confirmIn,
          createdAt: sentAt.toISOString(),
        },
        channel: 'PUSH',
      });
    }

    return proposal;
  }

  async acceptReschedule(reservationId: string, userId: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== userId) {
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    }
    if (r.rescheduleStatus !== 'PENDING') {
      throw new BadRequestException('Nema aktivnog zahtjeva za potvrdu termina.');
    }
    if (!r.rescheduleProposedStartTime || !r.rescheduleProposedEndTime) {
      throw new BadRequestException('Nedostaju predloženi podaci za novi termin.');
    }

    const dayStart = this.dates.parseDateOnly(r.reservationDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const conflicts = await this.prisma.reservation.findFirst({
      where: {
        id: { not: r.id },
        confirmedStylistId: r.confirmedStylistId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
            RESERVATION_STATUS.IN_PROGRESS,
          ] as any,
        },
        OR: [
          {
            AND: [
              { startTime: { lt: r.rescheduleProposedEndTime } },
              { endTime: { gt: r.rescheduleProposedStartTime } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (conflicts) {
      throw new BadRequestException(
        'Novi termin više nije dostupan zbog preklapanja. Pokušajte ponovo.',
      );
    }

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        startTime: r.rescheduleProposedStartTime,
        endTime: r.rescheduleProposedEndTime,
        rescheduleStatus: 'ACCEPTED',
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
      },
    });
    await this.notifyStylistAboutClientDecision(reservationId, 'accepted');
    return this.findOne(reservationId, {
      sub: userId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
  }

  async declineReschedule(reservationId: string, userId: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== userId) {
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    }
    if (r.rescheduleStatus !== 'PENDING') {
      throw new BadRequestException('Nema aktivnog zahtjeva za potvrdu termina.');
    }
    const pendingKind = await this.getPendingRescheduleKind(reservationId);
    const isReorder = pendingKind === 'reservation_reorder';

    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: isReorder
        ? {
            rescheduleStatus: 'DECLINED',
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          }
        : {
            status: RESERVATION_STATUS.CANCELLED_BY_CLIENT,
            cancelledAt: new Date(),
            cancelReason: 'Odbijena izmjena termina',
            rescheduleStatus: 'DECLINED',
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          },
    });

    const updated = await this.findOne(reservationId, {
      sub: userId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });

    if (isReorder) {
      this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, updated);
    } else {
      this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CANCELLED, updated);
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: r.serviceId,
        date: r.reservationDate,
      });
    }
    await this.notifyStylistAboutClientDecision(reservationId, 'declined');

    return updated;
  }

  async requestReorder(
    reservationId: string,
    userId: string,
    dto: { targetStartTime: string; targetEndTime: string },
  ) {
    const stylistProfileId = await this.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        clientId: true,
        confirmedStylistId: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        status: true,
        serviceId: true,
        rescheduleStatus: true,
        rescheduleProposedStartTime: true,
        rescheduleProposedEndTime: true,
      },
    });
    if (!reservation) throw new NotFoundException('Rezervacija nije pronađena.');
    if (reservation.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može predložiti pomjeranje termina.',
      );
    }
    if (
      reservation.status !== RESERVATION_STATUS.CONFIRMED &&
      reservation.status !== RESERVATION_STATUS.ATTENDANCE_CONFIRMED
    ) {
      throw new BadRequestException(
        'Pomjeranje je moguće samo za potvrđene buduće termine.',
      );
    }
    const originalDuration =
      timeToMinutes(reservation.endTime) - timeToMinutes(reservation.startTime);
    const newDuration =
      timeToMinutes(dto.targetEndTime) - timeToMinutes(dto.targetStartTime);
    if (originalDuration !== newDuration) {
      throw new BadRequestException(
        'Pomjeranje je dozvoljeno samo na termin istog trajanja.',
      );
    }
    if (this.isReservationBlocked(reservation)) {
      throw new BadRequestException(
        'Rezervacija već čeka potvrdu prethodne promjene.',
      );
    }

    const dayStart = this.dates.parseDateOnly(reservation.reservationDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        id: { not: reservation.id },
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
            RESERVATION_STATUS.IN_PROGRESS,
          ] as any,
        },
        OR: [
          {
            AND: [
              { startTime: { lt: dto.targetEndTime } },
              { endTime: { gt: dto.targetStartTime } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (conflict) {
      throw new BadRequestException('Odabrani termin je zauzet.');
    }

    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        rescheduleProposedStartTime: dto.targetStartTime,
        rescheduleProposedEndTime: dto.targetEndTime,
        rescheduleStatus: 'PENDING',
      },
    });

    const sentAt = new Date();
    const confirmIn = this.computeRescheduleDeadlineMinutes(
      sentAt,
      dto.targetStartTime,
      reservation.reservationDate,
    );
    await this.notifications.send({
      userId: reservation.clientId,
      title: 'Prijedlog pomjeranja termina',
      body: `Stilist predlaže novi termin ${dto.targetStartTime}–${dto.targetEndTime}. Potvrdite u narednih ${confirmIn} min.`,
      type: 'reservation_reminder',
      data: {
        kind: 'reservation_reorder',
        reservationId: reservation.id,
        confirmationDeadlineMinutes: confirmIn,
        createdAt: sentAt.toISOString(),
      },
      channel: 'PUSH',
    });

    return this.findOne(reservation.id, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
  }

  async processPendingRescheduleTimeouts() {
    const pending = await this.prisma.reservation.findMany({
      where: {
        rescheduleStatus: 'PENDING',
        rescheduleProposedStartTime: { not: null },
        rescheduleProposedEndTime: { not: null },
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
        serviceId: true,
        reservationDate: true,
        startTime: true,
        rescheduleProposedStartTime: true,
        rescheduleProposedEndTime: true,
      },
    });
    const now = new Date();
    for (const r of pending) {
      const latestNotice = await this.prisma.notification.findFirst({
        where: {
          userId: r.clientId,
          type: { in: ['reservation_reschedule', 'reservation_reminder'] as any },
          data: {
            path: '$.reservationId',
            equals: r.id,
          },
        },
        orderBy: { sentAt: 'desc' },
        select: { sentAt: true, data: true },
      });
      if (!latestNotice?.sentAt || !r.rescheduleProposedStartTime) continue;
      const deadlineMinutes = this.computeRescheduleDeadlineMinutes(
        latestNotice.sentAt,
        r.rescheduleProposedStartTime,
        r.reservationDate,
      );
      const deadline = new Date(
        latestNotice.sentAt.getTime() + deadlineMinutes * 60 * 1000,
      );
      if (now.getTime() <= deadline.getTime()) continue;

      const data = (latestNotice.data ?? {}) as Record<string, unknown>;
      const isReorder = data.kind === 'reservation_reorder';

      await this.prisma.reservation.update({
        where: { id: r.id },
        data: isReorder
          ? {
              rescheduleStatus: 'DECLINED',
              rescheduleProposedStartTime: null,
              rescheduleProposedEndTime: null,
            }
          : {
              status: RESERVATION_STATUS.CANCELLED_BY_CLIENT,
              cancelledAt: now,
              cancelReason: 'Nije potvrđen novi termin u predviđenom roku.',
              rescheduleStatus: 'DECLINED',
              rescheduleProposedStartTime: null,
              rescheduleProposedEndTime: null,
            },
      });

      if (!isReorder) {
        const salon = await this.prisma.salonSettings.findFirst();
        if (salon) {
          await this.incrementCancellationCount(r.clientId, {
            maxCancellationsBeforePenalty: salon.maxCancellationsBeforePenalty,
            penaltyDurationDays: salon.penaltyDurationDays,
          });
        }
      }
      await this.notifyStylistAboutClientDecision(r.id, 'timeout_cancelled');
    }
  }

  async autoStartUpcomingReservations() {
    const now = new Date();
    const todayStr = this.dates.toLocalDateOnlyString(now);
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;

    const candidates = await this.prisma.reservation.findMany({
      where: {
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          ] as any,
        },
        confirmedStylistId: { not: null },
        startTime: { lte: nowHHMM },
      },
      select: {
        id: true,
        clientId: true,
        confirmedStylistId: true,
        reservationDate: true,
        startTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    for (const r of candidates) {
      const plannedStart = this.dates.combineDateAndTime(
        r.reservationDate,
        r.startTime,
      );
      // Ne oslanjamo se na string poređenje datuma zbog mogućeg tz pomaka.
      if (plannedStart.getTime() > now.getTime()) continue;
      // Sigurnosna ograda: ne auto-startamo stare termine od ranijih dana.
      const ageMinutes = Math.floor((now.getTime() - plannedStart.getTime()) / 60000);
      if (ageMinutes > 24 * 60) continue;
      if (this.dates.toLocalDateOnlyString(plannedStart) !== todayStr) continue;
      const dayStart = this.dates.parseDateOnly(r.reservationDate);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const alreadyRunning = await this.prisma.reservation.findFirst({
        where: {
          id: { not: r.id },
          confirmedStylistId: r.confirmedStylistId,
          reservationDate: { gte: dayStart, lte: dayEnd },
          status: RESERVATION_STATUS.IN_PROGRESS,
        },
        select: { id: true },
      });
      if (alreadyRunning) continue;

      await this.prisma.reservation.update({
        where: { id: r.id },
        data: {
          status: RESERVATION_STATUS.IN_PROGRESS,
          startedAt: now,
        },
      });
    }
  }
}
