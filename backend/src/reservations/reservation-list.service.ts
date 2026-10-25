import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getDateOnlyDayBounds,
  getDateOnlyRangeBounds,
  parseDateOnlyString,
} from '../common/utils/date-only';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationDateService } from './reservation-date.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { hideOverlappingInboxWhileLocked } from './utils/inbox-lock-filter';
import { resolveAttendanceClientDeadlineAt } from './utils/attendance-client-deadline';

@Injectable()
export class ReservationListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shared: ReservationSharedService,
    private readonly dates: ReservationDateService,
  ) {}

  private buildClientNameSearch(
    search: string,
  ): Array<Record<string, unknown>> {
    const tokens = search.split(/\s+/).filter(Boolean);
    const clauses: Array<Record<string, unknown>> = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
    if (tokens.length >= 2) {
      const first = tokens[0];
      const last = tokens.slice(1).join(' ');
      clauses.push(
        {
          AND: [
            { firstName: { contains: first } },
            { lastName: { contains: last } },
          ],
        },
        {
          AND: [
            { firstName: { contains: last } },
            { lastName: { contains: first } },
          ],
        },
      );
    }
    return clauses;
  }

  async findAll(
    query: {
      fromDate?: string;
      toDate?: string;
      status?: string;
      clientSearch?: string;
      asClient?: boolean;
      asStylist?: boolean;
      page?: number;
      pageSize?: number;
    },
    user: CurrentUserPayload,
  ) {
    const where: {
      reservationDate?: { gte?: Date; lt?: Date };
      status?: string;
      clientId?: string;
      client?: { OR: Array<Record<string, unknown>> };
      OR?: Array<{
        confirmedStylistId?: string;
        stylistResponses?: { some: { stylistProfileId: string } };
      }>;
    } = {};
    if (query.fromDate || query.toDate) {
      try {
        if (query.fromDate && query.toDate) {
          where.reservationDate = getDateOnlyRangeBounds(
            query.fromDate,
            query.toDate,
          );
        } else if (query.fromDate) {
          where.reservationDate = {
            gte: parseDateOnlyString(query.fromDate),
          };
        } else if (query.toDate) {
          const { lt } = getDateOnlyDayBounds(query.toDate);
          where.reservationDate = { lt };
        }
      } catch {
        throw new BadRequestException(
          'fromDate i toDate moraju biti važeći datumi u formatu YYYY-MM-DD.',
        );
      }
    }
    if (query.status) where.status = query.status;
    const clientSearch = query.clientSearch?.trim();
    if (clientSearch) {
      where.client = { OR: this.buildClientNameSearch(clientSearch) };
    }
    if (query.asClient) where.clientId = user.sub;
    if (query.asStylist) {
      const stylistProfileId =
        await this.shared.getStylistProfileIdByUserId(user.sub);
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
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
              heroImage: true,
            },
          },
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
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
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
    const hours = await this.dates.getAttendanceConfirmDeadlineHours();
    const attachDeadline = <T extends {
      status: string;
      attendancePolicy?: string | null;
      reservationDate: Date;
      startTime: string;
    }>(
      rows: T[],
    ) =>
      rows.map((row) => ({
        ...row,
        attendanceClientDeadlineAt: resolveAttendanceClientDeadlineAt(
          row,
          hours,
          (date, time) => this.dates.combineDateAndTime(date, time),
        ),
      }));
    const hasPagination = query.page != null && query.pageSize != null;
    if (!hasPagination) {
      const rows = await this.prisma.reservation.findMany({
        where,
        include,
        orderBy: [{ reservationDate: 'asc' }, { startTime: 'asc' }],
      });
      if (!query.asStylist) return attachDeadline(rows);
      const stylistProfileId =
        await this.shared.getStylistProfileIdByUserId(user.sub);
      if (!stylistProfileId) return attachDeadline(rows);
      return attachDeadline(
        hideOverlappingInboxWhileLocked(rows, stylistProfileId),
      );
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
    return { items: attachDeadline(items), total, page, pageSize };
  }
}
