import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { assertReservationTransition } from './assert-reservation-transition';
import type { ReservationStatus } from './constants';
import {
  getStylistIdsForServices,
  type StylistServiceReader,
} from './utils/service-eligibility';

@Injectable()
export class ReservationSharedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
  ) {}

  transitionTo(from: string, to: ReservationStatus): ReservationStatus {
    if (from === to) return to;
    assertReservationTransition(from, to);
    return to;
  }

  async getStylistProfileIdByUserId(
    userId: string,
  ): Promise<string | null> {
    const p = await this.prisma.stylistProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return p?.id ?? null;
  }

  private buildPublicReferenceCodeForDate(reservationDate: Date): string {
    const d = this.dates.parseDateOnly(reservationDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `RZ-${y}${m}${day}-${suffix}`;
  }

  private generateClientViewToken(): string {
    return randomBytes(32).toString('hex');
  }

  async allocateReservationPublicCodes(
    reservationDate: Date,
    db: Pick<Prisma.TransactionClient, 'reservation'> = this.prisma,
  ): Promise<{ publicReferenceCode: string; clientViewToken: string }> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const publicReferenceCode =
        this.buildPublicReferenceCodeForDate(reservationDate);
      const clientViewToken = this.generateClientViewToken();
      const clash = await db.reservation.findFirst({
        where: { OR: [{ publicReferenceCode }, { clientViewToken }] },
        select: { id: true },
      });
      if (!clash) return { publicReferenceCode, clientViewToken };
    }
    throw new BadRequestException(
      'Ne možemo generisati jedinstveni kod rezervacije. Pokušajte ponovo.',
    );
  }

  async getClientForReservation(
    clientId: string,
    opts?: {
      ignoreMustChangePassword?: boolean;
      relaxContactRequirements?: boolean;
    },
    db: Pick<Prisma.TransactionClient, 'user'> = this.prisma,
  ) {
    const client = await db.user.findUnique({
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
    if (client.mustChangePassword && !opts?.ignoreMustChangePassword)
      throw new BadRequestException('MUST_CHANGE_PASSWORD');
    if (!opts?.relaxContactRequirements) {
      if (!client.email) throw new BadRequestException('EMAIL_REQUIRED');
      if (!client.phone) throw new BadRequestException('PHONE_REQUIRED');
      if (!client.isEmailVerified)
        throw new BadRequestException('EMAIL_NOT_VERIFIED');
    }
    if (!client.gender) throw new BadRequestException('GENDER_REQUIRED');
    return client;
  }

  async checkClientPenalty(
    clientId: string,
    db: Pick<Prisma.TransactionClient, 'clientCancellationCount'> = this.prisma,
  ) {
    const rec = await db.clientCancellationCount.findUnique({
      where: { userId: clientId },
    });
    if (rec?.penaltyUntil && new Date() < rec.penaltyUntil) {
      throw new BadRequestException(
        `Zbog čestih otkazivanja rezervacija je onemogućena do ${this.dates.toLocalDateOnlyString(rec.penaltyUntil)}.`,
      );
    }
  }

  async incrementCancellationCount(
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
      penaltyUntil.setDate(
        penaltyUntil.getDate() + salon.penaltyDurationDays,
      );
    }
    await this.prisma.clientCancellationCount.upsert({
      where: { userId: clientId },
      create: { userId: clientId, cancellationCount: count, penaltyUntil },
      update: { cancellationCount: count, penaltyUntil },
    });
  }

  async getEligibleStylistsForServices(
    serviceIds: string[],
    db: StylistServiceReader = this.prisma,
  ): Promise<string[]> {
    return getStylistIdsForServices(db, serviceIds);
  }

  isReservationBlocked(res: {
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

  computeRescheduleDeadlineMinutes(
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
      Math.floor(
        (proposedStart.getTime() - sentAt.getTime()) / 60000,
      ),
    );
    return Math.max(1, Math.min(30, Math.floor(minutesUntil * 0.5)));
  }
}
