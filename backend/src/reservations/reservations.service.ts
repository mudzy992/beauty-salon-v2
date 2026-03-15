import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { StylistRejectDto } from './dto/stylist-respond.dto';
import {
  RESERVATION_STATUS,
  RESERVATION_TRANSITIONS,
  type ReservationStatus,
} from './constants';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
  ) {}

  async create(dto: CreateReservationDto, clientId: string) {
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

    const full = await this.findOne(reservation.id, { sub: clientId, roles: ['CLIENT'], username: '', email: '' });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_CREATED, full);
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: dto.serviceId,
      date: dto.reservationDate,
    });
    return full;
  }

  async findAll(
    query: { fromDate?: string; toDate?: string; status?: string; asClient?: boolean; asStylist?: boolean },
    user: CurrentUserPayload,
  ) {
    const where: {
      reservationDate?: { gte?: Date; lte?: Date };
      status?: string;
      clientId?: string;
      OR?: Array<{ confirmedStylistId?: string; stylistResponses?: { some: { stylistProfileId: string } } }>;
    } = {};
    if (query.fromDate) {
      where.reservationDate = { ...where.reservationDate, gte: new Date(query.fromDate) };
    }
    if (query.toDate) {
      where.reservationDate = { ...where.reservationDate, lte: new Date(query.toDate) };
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

    return this.prisma.reservation.findMany({
      where,
      include: {
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
        client: { select: { id: true, firstName: true, lastName: true } },
        confirmedStylist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        stylistResponses: {
          include: { stylistProfile: { include: { user: { select: { firstName: true, lastName: true } } } } },
        },
      },
      orderBy: [{ reservationDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        service: { include: { subcategory: { include: { category: true } } } },
        client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        confirmedStylist: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        stylistResponses: {
          include: { stylistProfile: { include: { user: { select: { id: true, firstName: true, lastName: true } } } } },
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
    if (!canAccess) throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    return r;
  }

  async cancelByClient(id: string, clientId: string, dto?: CancelReservationDto) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== clientId) throw new ForbiddenException('Samo klijent može otkazati rezervaciju.');
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
    const cancelled = await this.findOne(id, { sub: clientId, roles: ['CLIENT'], username: '', email: '' });
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
    if (r.clientId !== clientId) throw new ForbiddenException('Samo klijent može potvrditi dolazak.');
    if (r.status !== RESERVATION_STATUS.CONFIRMED) {
      throw new BadRequestException('Rezervacija mora biti potvrđena od strane stilista.');
    }

    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const minConfirmTime = new Date(r.reservationDate);
    minConfirmTime.setHours(0, 0, 0, 0);
    minConfirmTime.setHours(minConfirmTime.getHours() - salon.cancellationDeadlineHours);
    if (new Date() < minConfirmTime) {
      throw new BadRequestException('Dolazak se može potvrditi najranije 24h prije termina.');
    }

    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        attendanceConfirmedAt: new Date(),
      },
    });
    const confirmed = await this.findOne(id, { sub: clientId, roles: ['CLIENT'], username: '', email: '' });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, confirmed);
    return confirmed;
  }

  async stylistLock(reservationId: string, stylistProfileId: string, userId: string) {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) throw new NotFoundException('Salon nije konfigurisan.');
    const lockMinutes = salon.reservationLockMinutes;

    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
    if (res.status !== RESERVATION_STATUS.PENDING && res.status !== RESERVATION_STATUS.STYLIST_REVIEW) {
      throw new BadRequestException('Rezervacija nije u fazi odgovora stilista.');
    }

    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId) throw new ForbiddenException('Možete raditi samo na vlastitom profilu stilista.');

    const response = await this.prisma.reservationStylistResponse.findUnique({
      where: { reservationId_stylistProfileId: { reservationId, stylistProfileId } },
    });
    if (!response) throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
    if (response.status === 'LOCKED' && response.lockExpiresAt && new Date() < response.lockExpiresAt) {
      return this.findOne(reservationId, { sub: userId, roles: ['STYLIST'], username: '', email: '' });
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
        where: { reservationId_stylistProfileId: { reservationId, stylistProfileId } },
        data: { status: 'LOCKED', lockedAt: now, lockExpiresAt },
      }),
      this.prisma.reservation.update({
        where: { id: reservationId },
        data: { status: RESERVATION_STATUS.STYLIST_REVIEW },
      }),
    ]);

    const locked = await this.findOne(reservationId, { sub: userId, roles: ['STYLIST'], username: '', email: '' });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE, locked);
    this.events.emitToUser(res.clientId, SOCKET_EVENTS.RESERVATION_UPDATED, locked);
    return locked;
  }

  async stylistAccept(reservationId: string, stylistProfileId: string, userId: string) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId) throw new ForbiddenException('Možete raditi samo na vlastitom profilu stilista.');

    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');

    const response = res.stylistResponses.find((r) => r.stylistProfileId === stylistProfileId);
    if (!response) throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
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
        where: { reservationId_stylistProfileId: { reservationId, stylistProfileId } },
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
      select: { clientId: true, service: { select: { name: true } }, reservationDate: true, startTime: true },
    });
    if (resWithClient?.clientId) {
      await this.notifications.send(
        {
          userId: resWithClient.clientId,
          title: 'Rezervacija potvrđena',
          body: `Vaša rezervacija za ${resWithClient.service.name} je potvrđena.`,
          type: 'reservation_confirmed',
          data: { reservationId },
        },
      );
    }

    const accepted = await this.findOne(reservationId, { sub: userId, roles: ['STYLIST'], username: '', email: '' });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_CONFIRMED, accepted);
    if (resWithClient?.clientId) {
      this.events.emitToUser(resWithClient.clientId, SOCKET_EVENTS.RESERVATION_CONFIRMED, accepted);
    }
    this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
      serviceId: accepted.serviceId,
      date: accepted.reservationDate,
    });
    return accepted;
  }

  async stylistReject(reservationId: string, stylistProfileId: string, userId: string, dto?: StylistRejectDto) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { userId: true },
    });
    if (!stylist || stylist.userId !== userId) throw new ForbiddenException('Možete raditi samo na vlastitom profilu stilista.');

    const res = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { stylistResponses: true },
    });
    if (!res) throw new NotFoundException('Rezervacija nije pronađena.');

    const response = res.stylistResponses.find((r) => r.stylistProfileId === stylistProfileId);
    if (!response) throw new NotFoundException('Odgovor za ovog stilista nije pronađen.');
    if (response.status !== 'LOCKED' && response.status !== 'PENDING') {
      throw new BadRequestException('Već ste odgovorili.');
    }

    await this.prisma.reservationStylistResponse.update({
      where: { reservationId_stylistProfileId: { reservationId, stylistProfileId } },
      data: { status: 'REJECTED', rejectionReason: dto?.rejectionReason, respondedAt: new Date() },
    });

    const stillPendingOrLocked = res.stylistResponses.filter(
      (r) =>
        r.stylistProfileId !== stylistProfileId &&
        (r.status === 'PENDING' || (r.status === 'LOCKED' && r.lockExpiresAt && new Date() < r.lockExpiresAt)),
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

    const result = await this.findOne(reservationId, { sub: userId, roles: ['STYLIST'], username: '', email: '' });
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_STYLIST_RESPONSE, result);
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
        `Zbog čestih otkazivanja rezervacija je onemogućena do ${rec.penaltyUntil.toISOString().slice(0, 10)}.`,
      );
    }
  }

  private async incrementCancellationCount(clientId: string, salon: { maxCancellationsBeforePenalty: number; penaltyDurationDays: number }) {
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
    if (!stylistProfileId) throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException('Samo potvrđeni stilist može označiti rezervaciju kao završenu.');
    }
    const allowed = [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.ATTENDANCE_CONFIRMED, RESERVATION_STATUS.IN_PROGRESS];
    if (!allowed.includes(r.status as any)) {
      throw new BadRequestException('Rezervacija mora biti potvrđena ili u toku da bi se označila završenom.');
    }
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: RESERVATION_STATUS.COMPLETED },
    });
    return this.findOne(reservationId, { sub: userId, roles: ['STYLIST'], username: '', email: '' });
  }

  private async getStylistProfileIdByUserId(userId: string): Promise<string | null> {
    const p = await this.prisma.stylistProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return p?.id ?? null;
  }
}
