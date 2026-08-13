import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { PublicReservationViewDto } from './dto/public-reservation-view.dto';
import { formatReservationServicesLabel } from './utils/reservation-services-label';
import { mapReservationPaymentSummary } from './reservation-payment-summary';
import { resolveAttendanceClientDeadlineAt } from './utils/attendance-client-deadline';

@Injectable()
export class ReservationQueriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
  ) {}

  async findPublicByViewToken(
    rawToken: string,
  ): Promise<PublicReservationViewDto> {
    const token = rawToken?.trim().toLowerCase();
    if (!token || token.length < 32 || !/^[a-f0-9]+$/.test(token)) {
      throw new NotFoundException('Rezervacija nije pronađena.');
    }
    const r = await this.prisma.reservation.findUnique({
      where: { clientViewToken: token },
      include: {
        service: { select: { name: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { service: { select: { name: true } } },
        },
        confirmedStylist: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    const u = r.confirmedStylist?.user;
    const stylistName = u
      ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null
      : null;
    return {
      publicReferenceCode: r.publicReferenceCode,
      reservationDate: this.dates.toLocalDateOnlyString(r.reservationDate),
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status,
      serviceName: formatReservationServicesLabel({
        items: r.items,
        fallbackServiceName: r.service.name,
      }),
      stylistName,
      clientNotes: r.clientNotes,
      cancelReason: r.cancelReason,
      cancelledAt: r.cancelledAt ? r.cancelledAt.toISOString() : null,
      rescheduleStatus: r.rescheduleStatus,
      rescheduleProposedStartTime: r.rescheduleProposedStartTime,
      rescheduleProposedEndTime: r.rescheduleProposedEndTime,
    };
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const r = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        service: {
          include: { subcategory: { include: { category: true } } },
        },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            service: {
              include: { subcategory: { include: { category: true } } },
            },
          },
        },
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
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        stylistResponses: {
          include: {
            stylistProfile: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(user.sub);
    const canAccess =
      r.clientId === user.sub ||
      r.confirmedStylistId === stylistProfileId ||
      r.stylistResponses.some(
        (sr) => sr.stylistProfile.userId === user.sub,
      ) ||
      user.roles.includes('SYSTEM_ADMIN') ||
      user.roles.includes('OWNER');
    if (!canAccess)
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    const paymentEntry = await this.prisma.dailyLogEntry.findFirst({
      where: {
        reservationId: id,
        kind: 'SERVICE',
        status: 'COMPLETED',
        deletedAt: null,
      },
      orderBy: { completedAt: 'desc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { service: { select: { name: true } } },
        },
      },
    });
    const deadlineHours = await this.dates.getAttendanceConfirmDeadlineHours();
    return {
      ...r,
      paymentSummary: mapReservationPaymentSummary(paymentEntry),
      attendanceClientDeadlineAt: resolveAttendanceClientDeadlineAt(
        r,
        deadlineHours,
        (date, time) => this.dates.combineDateAndTime(date, time),
      ),
    };
  }
}
