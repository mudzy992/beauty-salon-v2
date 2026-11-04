import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
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
import {
  MAX_API_PAGE_LIMIT,
  MAX_API_PAGE_OFFSET,
} from '../common/pagination.constants';

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
    const canListAllReservations =
      user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
    if (!query.asClient && !query.asStylist && !canListAllReservations) {
      throw new ForbiddenException('Nemate pristup listi svih rezervacija.');
    }

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
      const canListAsStylist =
        user.roles.includes('STYLIST') || canListAllReservations;
      if (!canListAsStylist) {
        throw new ForbiddenException('Nemate pristup rezervacijama stiliste.');
      }
      const stylistProfileId = await this.shared.getStylistProfileIdByUserId(
        user.sub,
      );
      if (!stylistProfileId) {
        throw new ForbiddenException(
          'Stilist profil nije dostupan za ovaj račun.',
        );
      }
      where.OR = [
        { confirmedStylistId: stylistProfileId },
        { stylistResponses: { some: { stylistProfileId } } },
      ];
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
    const attachDeadline = <
      T extends {
        status: string;
        attendancePolicy?: string | null;
        reservationDate: Date;
        startTime: string;
      },
    >(
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
    const hasPage = query.page != null;
    const hasPageSize = query.pageSize != null;
    if (hasPage !== hasPageSize) {
      throw new BadRequestException(
        'page i pageSize moraju biti navedeni zajedno.',
      );
    }
    const orderBy = [
      { reservationDate: 'asc' as const },
      { startTime: 'asc' as const },
      { id: 'asc' as const },
    ];
    if (!hasPage) {
      const rows = await this.prisma.reservation.findMany({
        where,
        omit: {
          clientViewToken: true,
          idempotencyKey: true,
          idempotencyRequestHash: true,
        },
        include,
        orderBy,
      });
      if (!query.asStylist) return attachDeadline(rows);
      const stylistProfileId = await this.shared.getStylistProfileIdByUserId(
        user.sub,
      );
      if (!stylistProfileId) return attachDeadline(rows);
      return attachDeadline(
        hideOverlappingInboxWhileLocked(rows, stylistProfileId),
      );
    }

    const page = query.page!;
    const pageSize = query.pageSize!;
    const offset = page * pageSize;
    if (
      !Number.isSafeInteger(page) ||
      !Number.isSafeInteger(pageSize) ||
      page < 0 ||
      page > MAX_API_PAGE_OFFSET ||
      pageSize < 1 ||
      pageSize > MAX_API_PAGE_LIMIT ||
      !Number.isSafeInteger(offset) ||
      offset > MAX_API_PAGE_OFFSET
    ) {
      throw new BadRequestException('Parametri paginacije nisu validni.');
    }
    const [items, total] = await Promise.all([
      this.prisma.reservation.findMany({
        where,
        omit: {
          clientViewToken: true,
          idempotencyKey: true,
          idempotencyRequestHash: true,
        },
        include,
        orderBy,
        skip: offset,
        take: pageSize,
      }),
      this.prisma.reservation.count({ where }),
    ]);
    return { items: attachDeadline(items), total, page, pageSize };
  }
}
