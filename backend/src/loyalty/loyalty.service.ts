import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

type LoyaltyTier = { id: string; name: string; minPoints: number };

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  private parseNumber(value: string | null, fallback: number): number {
    if (!value) return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private parseBoolean(value: string | null, fallback: boolean): boolean {
    if (!value) return fallback;
    return value.toLowerCase() === 'true';
  }

  private parseJsonArray<T>(value: string | null, fallback: T[]): T[] {
    if (!value) return fallback;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  private async getTiers(): Promise<LoyaltyTier[]> {
    const raw = await this.settings.getValue('loyalty_tiers');
    const fallback: LoyaltyTier[] = [
      { id: 'silver', name: 'Silver', minPoints: 0 },
      { id: 'gold', name: 'Gold', minPoints: 500 },
      { id: 'platinum', name: 'Platinum', minPoints: 1500 },
    ];
    return this.parseJsonArray<LoyaltyTier>(raw, fallback).sort((a, b) => a.minPoints - b.minPoints);
  }

  private async recalculateTier(accountId: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
      select: { id: true, points: true },
    });
    if (!account) return;
    const tiers = await this.getTiers();
    const eligible = tiers.filter((t) => account.points >= t.minPoints);
    const currentTier = eligible.length > 0 ? eligible[eligible.length - 1] : null;
    await this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { tier: currentTier ? currentTier.name : null },
    });
  }

  async findAll() {
    return this.prisma.loyaltyAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    return account;
  }

  async updateActive(id: string, isActive: boolean) {
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    return this.prisma.loyaltyAccount.update({
      where: { id },
      data: { isActive },
      include: {
        user: { select: { id: true, username: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async isProgramEnabled(): Promise<boolean> {
    const value = await this.settings.getValue('loyalty_enabled');
    return value === 'true';
  }

  /**
   * Minimalna implementacija: kada je program uključen i
   * klijent ispuni uslov (npr. ima završenu rezervaciju),
   * osiguravamo da postoji loyalty račun.
   */
  async ensureAccountForUser(userId: string) {
    const enabled = await this.isProgramEnabled();
    if (!enabled) return null;

    const existing = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (existing) return existing;

    return this.prisma.loyaltyAccount.create({
      data: {
        userId,
        isActive: true,
      },
    });
  }

  /**
   * Earn points based on completed daily log entry.
   * Returns null if program disabled or no client/amount.
   */
  async earnFromDailyLog(entry: {
    id: string;
    clientId: string | null;
    actualPrice: number;
    tipAmount: number;
    serviceId: string;
  }) {
    const enabled = await this.isProgramEnabled();
    if (!enabled) return null;
    if (!entry.clientId) return null;
    if (entry.actualPrice <= 0) return null;

    const pointsPerCurrency = this.parseNumber(await this.settings.getValue('loyalty_points_per_currency'), 1);
    const earnOnTip = this.parseBoolean(await this.settings.getValue('loyalty_earn_on_tip'), false);
    const minAmount = this.parseNumber(await this.settings.getValue('loyalty_min_amount_for_earn'), 0);
    const excludedRaw = await this.settings.getValue('loyalty_excluded_services');
    const excluded: string[] = this.parseJsonArray<string>(excludedRaw, []);

    if (excluded.includes(entry.serviceId)) return null;

    const baseAmount = entry.actualPrice + (earnOnTip ? entry.tipAmount : 0);
    if (baseAmount < minAmount) return null;

    const rawPoints = Math.floor(baseAmount * pointsPerCurrency);
    if (rawPoints <= 0) return null;

    const account = await this.ensureAccountForUser(entry.clientId);
    if (!account) return null;

    const updated = await this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        points: { increment: rawPoints },
        transactions: {
          create: {
            points: rawPoints,
            type: 'EARN',
            source: `daily_log:${entry.id}`,
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.recalculateTier(updated.id);
    return updated;
  }

  async getSettings() {
    const keys = [
      'loyalty_enabled',
      'loyalty_points_per_currency',
      'loyalty_earn_on_tip',
      'loyalty_min_amount_for_earn',
      'loyalty_excluded_services',
      'loyalty_redeem_enabled',
      'loyalty_redeem_rate',
      'loyalty_min_points_to_redeem',
      'loyalty_max_discount_percent',
      'loyalty_tiers',
    ];
    const settings = await this.prisma.appSetting.findMany({
      where: { key: { in: keys } },
    });
    return settings;
  }

  async redeemPoints(accountId: string, points: number, reason?: string) {
    if (points <= 0 || !Number.isFinite(points)) {
      throw new BadRequestException('Broj bodova mora biti pozitivan.');
    }
    const enabled = this.parseBoolean(await this.settings.getValue('loyalty_redeem_enabled'), false);
    if (!enabled) throw new BadRequestException('Redeem je trenutno onemogućen.');

    const minPoints = this.parseNumber(await this.settings.getValue('loyalty_min_points_to_redeem'), 0);
    if (points < minPoints) {
      throw new BadRequestException('Broj bodova je ispod minimalnog za korištenje.');
    }

    const account = await this.prisma.loyaltyAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    if (!account.isActive) throw new BadRequestException('Loyalty račun nije aktivan.');
    if (account.points < points) throw new BadRequestException('Nedovoljno bodova.');

    const updated = await this.prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: {
        points: { decrement: points },
        transactions: {
          create: {
            points,
            type: 'REDEEM',
            source: reason ?? 'Manual redeem',
          },
        },
      },
    });
    await this.recalculateTier(updated.id);
    return updated;
  }

  async adjustPoints(accountId: string, pointsDelta: number, note?: string) {
    if (!Number.isFinite(pointsDelta) || pointsDelta === 0) {
      throw new BadRequestException('Promjena bodova mora biti različita od nule.');
    }
    const account = await this.prisma.loyaltyAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');

    const newPoints = account.points + pointsDelta;
    if (newPoints < 0) {
      throw new BadRequestException('Rezultat bi bio negativan broj bodova.');
    }

    const updated = await this.prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: {
        points: { set: newPoints },
        transactions: {
          create: {
            points: pointsDelta,
            type: 'ADJUST',
            source: note ?? 'Admin adjust',
          },
        },
      },
    });
    await this.recalculateTier(updated.id);
    return updated;
  }
}
