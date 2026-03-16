import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MonthlyFinance {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  tips: number;
}

export interface StylistPerformance {
  stylistProfileId: string;
  stylistName: string;
  completedCount: number;
  revenue: number;
  tips: number;
}

export interface TopServiceRow {
  serviceId: string;
  serviceName: string;
  count: number;
  revenue: number;
}

export interface AnalyticsDashboard {
  monthlyFinance: MonthlyFinance[];
  stylistPerformance: StylistPerformance[];
  topServices: TopServiceRow[];
  conversionRate: number | null;
  totalPending: number;
  totalCompleted: number;
  fromDate: string;
  toDate: string;
}

export interface AnalyticsDashboardParams {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;
  year?: number;
  month?: number; // 1-12
  monthsBack?: number; // default 12
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Iz parametara izračunaj [fromDate, toDate] i listu mjeseci { year, month } za prikaz. */
function resolveDateRange(params: AnalyticsDashboardParams): {
  fromDate: Date;
  toDate: Date;
  fromDateStr: string;
  toDateStr: string;
  months: { year: number; month: number }[];
} {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date;

  if (params.fromDate && params.toDate) {
    fromDate = new Date(params.fromDate);
    toDate = new Date(params.toDate);
    if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
  } else if (params.year != null && params.month != null) {
    const y = Number(params.year);
    const m = Number(params.month);
    fromDate = new Date(y, m - 1, 1);
    toDate = new Date(y, m, 0);
  } else {
    const back = Math.min(Number(params.monthsBack) || 12, 60);
    toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    fromDate = new Date(toDate);
    fromDate.setMonth(fromDate.getMonth() - back);
    fromDate.setDate(1);
  }

  const fromDateStr = toDateOnly(fromDate);
  const toDateStr = toDateOnly(toDate);

  const months: { year: number; month: number }[] = [];
  const cur = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
    cur.setMonth(cur.getMonth() + 1);
  }

  return { fromDate, toDate, fromDateStr, toDateStr, months };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(
    roles: string[],
    params: AnalyticsDashboardParams = {},
  ): Promise<AnalyticsDashboard> {
    if (!roles.includes('SYSTEM_ADMIN') && !roles.includes('OWNER')) {
      throw new ForbiddenException(
        'Samo admin ili vlasnik mogu pristupiti analitici.',
      );
    }

    const { fromDate, toDate, fromDateStr, toDateStr, months } =
      resolveDateRange(params);
    const monthlyFinance: MonthlyFinance[] = [];

    for (const { year, month } of months) {
      const [incomeBook, expenseBook] = await Promise.all([
        this.prisma.incomeBook.findUnique({
          where: { year_month: { year, month } },
        }),
        this.prisma.expenseBook.findUnique({
          where: { year_month: { year, month } },
          include: {
            expenses: { select: { totalAmount: true } },
          },
        }),
      ]);

      const income = Number(incomeBook?.totalRevenue ?? 0);
      const tips = Number(incomeBook?.totalTips ?? 0);
      const expenses =
        expenseBook?.expenses?.reduce(
          (s, e) => s + Number(e.totalAmount ?? 0),
          0,
        ) ?? 0;

      monthlyFinance.push({
        year,
        month,
        label: `${year}-${String(month).padStart(2, '0')}`,
        income,
        expenses,
        tips,
      });
    }

    const [stylistAgg, topServicesRaw, reservationCounts] = await Promise.all([
      this.getStylistPerformance(fromDate, toDate),
      this.getTopServices(fromDate, toDate),
      this.prisma.reservation.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          reservationDate: { gte: fromDate, lte: toDate },
          status: {
            in: [
              'PENDING',
              'STYLIST_REVIEW',
              'CONFIRMED',
              'ATTENDANCE_CONFIRMED',
              'IN_PROGRESS',
              'COMPLETED',
            ],
          },
        },
      }),
    ]);

    const totalPending = reservationCounts
      .filter((r) =>
        [
          'PENDING',
          'STYLIST_REVIEW',
          'CONFIRMED',
          'ATTENDANCE_CONFIRMED',
          'IN_PROGRESS',
        ].includes(r.status),
      )
      .reduce((s, r) => s + r._count.id, 0);
    const totalCompleted =
      reservationCounts.find((r) => r.status === 'COMPLETED')?._count.id ?? 0;
    const totalReservations = totalPending + totalCompleted;
    const conversionRate =
      totalReservations > 0 ? (totalCompleted / totalReservations) * 100 : null;

    return {
      monthlyFinance,
      stylistPerformance: stylistAgg,
      topServices: topServicesRaw,
      conversionRate:
        conversionRate != null ? Math.round(conversionRate * 10) / 10 : null,
      totalPending,
      totalCompleted,
      fromDate: fromDateStr,
      toDate: toDateStr,
    };
  }

  private async getStylistPerformance(
    fromDate: Date,
    toDate: Date,
  ): Promise<StylistPerformance[]> {
    const entries = await this.prisma.dailyLogEntry.findMany({
      where: { status: 'COMPLETED', date: { gte: fromDate, lte: toDate } },
      include: {
        stylistProfile: {
          include: {
            user: {
              select: { firstName: true, lastName: true, username: true },
            },
          },
        },
      },
    });

    const byStylist = new Map<
      string,
      { name: string; count: number; revenue: number; tips: number }
    >();

    for (const e of entries) {
      const id = e.stylistProfileId;
      const name =
        [e.stylistProfile?.user?.firstName, e.stylistProfile?.user?.lastName]
          .filter(Boolean)
          .join(' ') ||
        e.stylistProfile?.user?.username ||
        '—';
      if (!byStylist.has(id)) {
        byStylist.set(id, { name, count: 0, revenue: 0, tips: 0 });
      }
      const row = byStylist.get(id)!;
      row.count += 1;
      row.revenue += Number(e.actualPrice ?? 0);
      row.tips += Number(e.tipAmount ?? 0);
    }

    return Array.from(byStylist.entries()).map(([stylistProfileId, v]) => ({
      stylistProfileId,
      stylistName: v.name,
      completedCount: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
      tips: Math.round(v.tips * 100) / 100,
    }));
  }

  private async getTopServices(
    fromDate: Date,
    toDate: Date,
  ): Promise<TopServiceRow[]> {
    const [fromReservations, fromDailyLog] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          status: 'COMPLETED',
          reservationDate: { gte: fromDate, lte: toDate },
        },
        include: { service: { select: { id: true, name: true, price: true } } },
      }),
      this.prisma.dailyLogEntry.findMany({
        where: { status: 'COMPLETED', date: { gte: fromDate, lte: toDate } },
        include: { service: { select: { id: true, name: true, price: true } } },
      }),
    ]);

    const byService = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();

    for (const r of fromReservations) {
      const id = r.serviceId;
      const name = r.service?.name ?? '—';
      const price = Number(r.service?.price ?? 0);
      if (!byService.has(id)) byService.set(id, { name, count: 0, revenue: 0 });
      const row = byService.get(id)!;
      row.count += 1;
      row.revenue += price;
    }
    for (const e of fromDailyLog) {
      const id = e.serviceId;
      const name = e.service?.name ?? '—';
      const price = Number(e.actualPrice ?? 0);
      if (!byService.has(id)) byService.set(id, { name, count: 0, revenue: 0 });
      const row = byService.get(id)!;
      row.count += 1;
      row.revenue += price;
    }

    return Array.from(byService.entries())
      .map(([serviceId, v]) => ({
        serviceId,
        serviceName: v.name,
        count: v.count,
        revenue: Math.round(v.revenue * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
