import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toLocalDateOnlyString } from '../common/utils/date-only';
import { iterateMonthsInclusive } from '../common/utils/date-range';

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

export interface PeriodExpenseCategoryRow {
  categoryId: string;
  categoryName: string;
  total: number;
}

export interface PeriodFinance {
  servicesRevenue: number;
  tips: number;
  totalIncome: number;
  expensesByCategory: PeriodExpenseCategoryRow[];
  totalExpenses: number;
  netProfit: number;
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
  periodFinance: PeriodFinance;
}

export interface AnalyticsDashboardParams {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;
  year?: number;
  month?: number; // 1-12
  monthsBack?: number; // default 12
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

  const fromDateStr = toLocalDateOnlyString(fromDate);
  const toDateStr = toLocalDateOnlyString(toDate);
  const months = iterateMonthsInclusive(fromDate, toDate);

  return { fromDate, toDate, fromDateStr, toDateStr, months };
}

const roundFinance2 = (n: number): number => Math.round(n * 100) / 100;

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
    const categoryTotals = new Map<
      string,
      { categoryName: string; total: number }
    >();

    for (const { year, month } of months) {
      const [incomeBook, expenseBook] = await Promise.all([
        this.prisma.incomeBook.findUnique({
          where: { year_month: { year, month } },
        }),
        this.prisma.expenseBook.findUnique({
          where: { year_month: { year, month } },
          include: {
            expenses: {
              select: {
                totalAmount: true,
                category: { select: { id: true, name: true } },
              },
            },
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

      for (const e of expenseBook?.expenses ?? []) {
        const cid = e.category.id;
        const categoryName = e.category.name;
        const amt = Number(e.totalAmount ?? 0);
        const row = categoryTotals.get(cid);
        if (row) {
          row.total += amt;
        } else {
          categoryTotals.set(cid, { categoryName, total: amt });
        }
      }

      monthlyFinance.push({
        year,
        month,
        label: `${year}-${String(month).padStart(2, '0')}`,
        income,
        expenses,
        tips,
      });
    }

    const servicesRevenue = monthlyFinance.reduce((s, m) => s + m.income, 0);
    const tipsSum = monthlyFinance.reduce((s, m) => s + m.tips, 0);
    const totalIncomeRaw = servicesRevenue + tipsSum;
    const totalExpensesRaw = monthlyFinance.reduce((s, m) => s + m.expenses, 0);
    const expensesByCategory: PeriodExpenseCategoryRow[] = Array.from(
      categoryTotals.entries(),
    )
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: v.categoryName,
        total: roundFinance2(v.total),
      }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'bs'));

    const periodFinance: PeriodFinance = {
      servicesRevenue: roundFinance2(servicesRevenue),
      tips: roundFinance2(tipsSum),
      totalIncome: roundFinance2(totalIncomeRaw),
      expensesByCategory,
      totalExpenses: roundFinance2(totalExpensesRaw),
      netProfit: roundFinance2(totalIncomeRaw - totalExpensesRaw),
    };

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
      periodFinance,
    };
  }

  private async getStylistPerformance(
    fromDate: Date,
    toDate: Date,
  ): Promise<StylistPerformance[]> {
    const [entries, manualEntries] = await Promise.all([
      this.prisma.dailyLogEntry.findMany({
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
      }),
      this.prisma.incomeBookManualEntry.findMany({
        where: {
          stylistProfileId: { not: null },
          date: { gte: fromDate, lte: toDate },
        },
        include: {
          stylistProfile: {
            include: {
              user: {
                select: { firstName: true, lastName: true, username: true },
              },
            },
          },
        },
      }),
    ]);

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
    for (const m of manualEntries) {
      const id = m.stylistProfileId!;
      const name =
        [m.stylistProfile?.user?.firstName, m.stylistProfile?.user?.lastName]
          .filter(Boolean)
          .join(' ') ||
        m.stylistProfile?.user?.username ||
        '—';
      if (!byStylist.has(id)) {
        byStylist.set(id, { name, count: 0, revenue: 0, tips: 0 });
      }
      const row = byStylist.get(id)!;
      row.count += 1;
      row.revenue += Number(m.amount ?? 0);
      row.tips += Number(m.tipAmount ?? 0);
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
    const [fromReservations, fromDailyLog, fromManualIncome] = await Promise.all([
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
      this.prisma.incomeBookManualEntry.findMany({
        where: { date: { gte: fromDate, lte: toDate } },
        include: { service: { select: { id: true, name: true } } },
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
    for (const m of fromManualIncome) {
      const id = m.serviceId;
      const name = m.service?.name ?? '—';
      const amount = Number(m.amount ?? 0);
      if (!byService.has(id)) byService.set(id, { name, count: 0, revenue: 0 });
      const row = byService.get(id)!;
      row.count += 1;
      row.revenue += amount;
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
