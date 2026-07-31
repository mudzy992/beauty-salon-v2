import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

type LoyaltyTier = {
  id: string;
  name: string;
  minPoints: number;
  maxDiscountPercent?: number;
};

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
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed as T[];
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  private async getTiers(): Promise<LoyaltyTier[]> {
    const raw = await this.settings.getValue('loyalty_tiers');
    const fallback: LoyaltyTier[] = [
      { id: 'silver', name: 'Silver', minPoints: 0, maxDiscountPercent: 10 },
      { id: 'gold', name: 'Gold', minPoints: 500, maxDiscountPercent: 20 },
      {
        id: 'platinum',
        name: 'Platinum',
        minPoints: 1500,
        maxDiscountPercent: 30,
      },
    ];
    return this.parseJsonArray<LoyaltyTier>(raw, fallback).sort(
      (a, b) => a.minPoints - b.minPoints,
    );
  }

  private async getTierForPoints(points: number): Promise<LoyaltyTier | null> {
    const tiers = await this.getTiers();
    const eligible = tiers.filter((t) => points >= t.minPoints);
    return eligible.length > 0 ? eligible[eligible.length - 1] : null;
  }

  private async recalculateTier(accountId: string) {
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
      select: { id: true, points: true },
    });
    if (!account) return;
    const tiers = await this.getTiers();
    const eligible = tiers.filter((t) => account.points >= t.minPoints);
    const currentTier =
      eligible.length > 0 ? eligible[eligible.length - 1] : null;
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
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id },
    });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    return this.prisma.loyaltyAccount.update({
      where: { id },
      data: { isActive },
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
  async ensureAccountForUser(
    userId: string,
    options?: { requireEnabled?: boolean },
  ) {
    const requireEnabled = options?.requireEnabled ?? true;
    if (requireEnabled) {
      const enabled = await this.isProgramEnabled();
      if (!enabled) return null;
    }

    const existing = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });
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

    const pointsPerCurrency = this.parseNumber(
      await this.settings.getValue('loyalty_points_per_currency'),
      1,
    );
    const earnOnTip = this.parseBoolean(
      await this.settings.getValue('loyalty_earn_on_tip'),
      false,
    );
    const minAmount = this.parseNumber(
      await this.settings.getValue('loyalty_min_amount_for_earn'),
      0,
    );
    const excludedRaw = await this.settings.getValue(
      'loyalty_excluded_services',
    );
    const excluded: string[] = this.parseJsonArray<string>(excludedRaw, []);

    if (excluded.includes(entry.serviceId)) return null;

    const baseAmount = entry.actualPrice + (earnOnTip ? entry.tipAmount : 0);
    if (baseAmount < minAmount) return null;

    const rawPoints = Math.floor(baseAmount * pointsPerCurrency);
    if (rawPoints <= 0) return null;

    const account = await this.ensureAccountForUser(entry.clientId, {
      requireEnabled: false,
    });
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
    const items = await Promise.all(
      keys.map(async (key) => ({
        key,
        value: await this.settings.getValue(key),
      })),
    );
    return items;
  }

  /**
   * Vraća loyalty info koji frontend može prikazati (limit/cap) za određenog korisnika.
   * Koristi se i za klijenta (me) i za stilistu/admin (odabrani klijent).
   */
  async getClientLoyaltyInfo(
    userId: string,
    serviceId?: string,
    serviceIds?: string[],
  ) {
    const enabled = await this.isProgramEnabled();
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
    });
    if (!enabled || !account) {
      return { enabled, hasAccount: false };
    }

    const tier = await this.getTierForPoints(account.points);
    const redeemEnabled = this.parseBoolean(
      await this.settings.getValue('loyalty_redeem_enabled'),
      false,
    );
    const redeemRate = this.parseNumber(
      await this.settings.getValue('loyalty_redeem_rate'),
      0.1,
    );
    const minPoints = this.parseNumber(
      await this.settings.getValue('loyalty_min_points_to_redeem'),
      0,
    );
    const globalMaxPercent = this.parseNumber(
      await this.settings.getValue('loyalty_max_discount_percent'),
      100,
    );

    const normalizedServiceIds =
      serviceIds && serviceIds.length > 0
        ? [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))]
        : [];

    if (normalizedServiceIds.length > 0) {
      const services = await this.prisma.service.findMany({
        where: { id: { in: normalizedServiceIds } },
        select: {
          id: true,
          price: true,
          loyaltyEnabled: true,
          loyaltyMaxDiscountPercent: true,
        },
      });
      if (services.length !== normalizedServiceIds.length || services.some((s) => !s.loyaltyEnabled)) {
        return {
          enabled,
          hasAccount: true,
          redeemEnabled,
          points: account.points,
          tier: tier?.name ?? null,
          tierMaxDiscountPercent: tier?.maxDiscountPercent ?? 0,
          globalMaxDiscountPercent: globalMaxPercent,
          redeemRate,
          minPointsToRedeem: minPoints,
          service: null,
        };
      }

      const sumPrice = services
        .map((s) => Number(s.price))
        .reduce((acc, x) => acc + (Number.isFinite(x) ? x : 0), 0);
      const tierMax = tier?.maxDiscountPercent ?? 0;
      const serviceMax = Math.min(...services.map((s) => s.loyaltyMaxDiscountPercent ?? 0));
      const maxPercentForService = Math.min(tierMax, serviceMax, globalMaxPercent);

      let maxDiscountAmount = 0;
      let maxUsablePoints = 0;
      if (Number.isFinite(sumPrice) && sumPrice > 0 && maxPercentForService > 0 && redeemRate > 0) {
        maxDiscountAmount = (sumPrice * maxPercentForService) / 100;
        const maxByPercent = Math.floor(maxDiscountAmount / redeemRate);
        maxUsablePoints = Math.max(0, Math.min(maxByPercent, account.points));
      }

      return {
        enabled,
        hasAccount: true,
        redeemEnabled,
        points: account.points,
        tier: tier?.name ?? null,
        tierMaxDiscountPercent: tier?.maxDiscountPercent ?? 0,
        globalMaxDiscountPercent: globalMaxPercent,
        redeemRate,
        minPointsToRedeem: minPoints,
        service: {
          id: normalizedServiceIds.join(','),
          price: sumPrice,
          maxDiscountPercent: maxPercentForService,
          maxDiscountAmount,
          maxUsablePoints,
        },
      };
    }

    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          price: true,
          loyaltyEnabled: true,
          loyaltyMaxDiscountPercent: true,
        },
      });
      if (!service || !service.loyaltyEnabled) {
        return {
          enabled,
          hasAccount: true,
          redeemEnabled,
          points: account.points,
          tier: tier?.name ?? null,
          tierMaxDiscountPercent: tier?.maxDiscountPercent ?? 0,
          globalMaxDiscountPercent: globalMaxPercent,
          redeemRate,
          minPointsToRedeem: minPoints,
          service: null,
        };
      }

      const servicePrice = Number(service.price);
      let maxPercentForService = 0;
      let maxDiscountAmount = 0;
      let maxUsablePoints = 0;

      if (Number.isFinite(servicePrice) && servicePrice > 0) {
        const tierMax = tier?.maxDiscountPercent ?? 0;
        const serviceMax = service.loyaltyMaxDiscountPercent ?? 0;
        maxPercentForService = Math.min(tierMax, serviceMax, globalMaxPercent);
        if (maxPercentForService > 0 && redeemRate > 0) {
          maxDiscountAmount = (servicePrice * maxPercentForService) / 100;
          const maxByPercent = Math.floor(maxDiscountAmount / redeemRate);
          maxUsablePoints = Math.max(0, Math.min(maxByPercent, account.points));
        }
      }

      return {
        enabled,
        hasAccount: true,
        redeemEnabled,
        points: account.points,
        tier: tier?.name ?? null,
        tierMaxDiscountPercent: tier?.maxDiscountPercent ?? 0,
        globalMaxDiscountPercent: globalMaxPercent,
        redeemRate,
        minPointsToRedeem: minPoints,
        service: {
          id: serviceId,
          price: servicePrice,
          maxDiscountPercent: maxPercentForService,
          maxDiscountAmount,
          maxUsablePoints,
        },
      };
    }

    return {
      enabled,
      hasAccount: true,
      redeemEnabled,
      points: account.points,
      tier: tier?.name ?? null,
      tierMaxDiscountPercent: tier?.maxDiscountPercent ?? 0,
      globalMaxDiscountPercent: globalMaxPercent,
      redeemRate,
      minPointsToRedeem: minPoints,
      service: null,
    };
  }

  async redeemPoints(accountId: string, points: number, reason?: string) {
    if (points <= 0 || !Number.isFinite(points)) {
      throw new BadRequestException('Broj bodova mora biti pozitivan.');
    }
    const enabled = this.parseBoolean(
      await this.settings.getValue('loyalty_redeem_enabled'),
      false,
    );
    if (!enabled)
      throw new BadRequestException('Redeem je trenutno onemogućen.');

    const minPoints = this.parseNumber(
      await this.settings.getValue('loyalty_min_points_to_redeem'),
      0,
    );
    if (points < minPoints) {
      throw new BadRequestException(
        'Broj bodova je ispod minimalnog za korištenje.',
      );
    }

    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    if (!account.isActive)
      throw new BadRequestException('Loyalty račun nije aktivan.');
    if (account.points < points)
      throw new BadRequestException('Nedovoljno bodova.');

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

  /**
   * Redeem bodova za konkretnu rezervaciju, uz provjeru maksimalnog popusta po tieru, servisu i globalno.
   */
  async redeemForReservation(args: {
    clientId: string;
    reservationId: string;
    serviceId?: string;
    serviceIds?: string[];
    desiredPercent: number;
  }) {
    const { clientId, reservationId, desiredPercent } = args;
    const idsRaw =
      args.serviceIds && args.serviceIds.length > 0
        ? args.serviceIds
        : args.serviceId
          ? [args.serviceId]
          : [];
    const serviceIds = [...new Set(idsRaw.map((x) => x.trim()).filter(Boolean))];
    if (desiredPercent <= 0) return null;
    if (serviceIds.length === 0) {
      throw new BadRequestException('Servis nije pronađen.');
    }

    // Ako je za rezervaciju već evidentirano korištenje bodova, ne dozvoljavamo ponovni redeem.
    const existingReservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { loyaltyPointsUsed: true },
    });
    if (!existingReservation) {
      throw new BadRequestException(
        'Rezervacija nije pronađena za loyalty popust.',
      );
    }
    if (existingReservation.loyaltyPointsUsed > 0) {
      throw new BadRequestException(
        'Za ovu rezervaciju su već iskorišteni loyalty bodovi.',
      );
    }

    const programEnabled = await this.isProgramEnabled();
    if (!programEnabled) {
      throw new BadRequestException('Loyalty program trenutno nije aktivan.');
    }

    const redeemEnabled = this.parseBoolean(
      await this.settings.getValue('loyalty_redeem_enabled'),
      false,
    );
    if (!redeemEnabled) {
      throw new BadRequestException(
        'Korištenje bodova trenutno nije omogućeno.',
      );
    }

    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId: clientId },
    });
    if (!account || !account.isActive) {
      throw new BadRequestException('Nemate aktivan loyalty račun.');
    }

    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        price: true,
        loyaltyEnabled: true,
        loyaltyMaxDiscountPercent: true,
      },
    });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Servis nije pronađen.');
    }
    if (services.some((s) => !s.loyaltyEnabled)) {
      throw new BadRequestException(
        'Za jedan ili više odabranih servisa nije dozvoljen loyalty popust.',
      );
    }
    const prices = services.map((s) => Number(s.price));
    const sumPrice = prices.reduce((acc, x) => acc + (Number.isFinite(x) ? x : 0), 0);
    if (!Number.isFinite(sumPrice) || sumPrice <= 0) {
      throw new BadRequestException(
        'Cijena usluge nije validna za loyalty popust.',
      );
    }

    const tier = await this.getTierForPoints(account.points);
    const tierMaxPercent = tier?.maxDiscountPercent ?? 0;
    const serviceMaxPercent = Math.min(
      ...services.map((s) => s.loyaltyMaxDiscountPercent ?? 0),
    );
    const globalMaxPercent = this.parseNumber(
      await this.settings.getValue('loyalty_max_discount_percent'),
      100,
    );
    const allowedPercent = Math.min(
      tierMaxPercent,
      serviceMaxPercent,
      globalMaxPercent,
    );

    if (allowedPercent <= 0) {
      throw new BadRequestException(
        'Vaš nivo ne dozvoljava korištenje bodova za popust.',
      );
    }

    if (desiredPercent > allowedPercent) {
      throw new BadRequestException(
        'Odabrani procenat popusta je veći od maksimalnog dozvoljenog.',
      );
    }

    const redeemRate = this.parseNumber(
      await this.settings.getValue('loyalty_redeem_rate'),
      0.1,
    ); // KM po bodu
    if (redeemRate <= 0) {
      throw new BadRequestException(
        'Loyalty redeem stopa nije ispravno podešena.',
      );
    }

    const desiredDiscountAmount = (sumPrice * desiredPercent) / 100;
    const neededPoints = Math.floor(desiredDiscountAmount / redeemRate);

    const minPoints = this.parseNumber(
      await this.settings.getValue('loyalty_min_points_to_redeem'),
      0,
    );
    if (neededPoints < minPoints) {
      throw new BadRequestException(
        'Broj bodova koji bi se iskoristio je ispod minimalnog za korištenje.',
      );
    }

    if (neededPoints <= 0) {
      throw new BadRequestException(
        'Odabrani popust je prenizak da bi se isplatilo koristiti bodove.',
      );
    }

    if (account.points < neededPoints) {
      throw new BadRequestException(
        'Nemate dovoljno bodova za odabrani popust.',
      );
    }

    // Upis u loyalty račun i transakciju
    const updatedAccount = await this.redeemPoints(
      account.id,
      neededPoints,
      `Reservation ${reservationId} (${desiredPercent}%)`,
    );

    // Informativni upis popusta na rezervaciju (za prikaz u adminu)
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        loyaltyDiscountPercent: Math.round(desiredPercent),
        loyaltyDiscountAmount: desiredDiscountAmount,
        loyaltyPointsUsed: neededPoints,
      },
    });

    return updatedAccount;
  }

  /**
   * Redeem bodova za ručni zapis u dnevnoj knjizi, uz pravila identična rezervaciji.
   * Popust se računa na osnovu cijene servisa, a zapis u dnevniku mora imati actualPrice >= (price - popust).
   */
  async redeemForDailyLog(args: {
    clientId: string;
    dailyLogEntryId: string;
    serviceId?: string;
    serviceIds?: string[];
    desiredPercent: number;
    actualPrice: number;
    coveredByDebtAmount?: number;
  }) {
    const { clientId, dailyLogEntryId, desiredPercent, actualPrice } = args;
    const idsRaw =
      args.serviceIds && args.serviceIds.length > 0
        ? args.serviceIds
        : args.serviceId
          ? [args.serviceId]
          : [];
    const serviceIds = [...new Set(idsRaw.map((x) => x.trim()).filter(Boolean))];
    if (desiredPercent <= 0) return null;
    if (serviceIds.length === 0) {
      throw new NotFoundException('Servis nije pronađen.');
    }

    const existingEntry = await this.prisma.dailyLogEntry.findUnique({
      where: { id: dailyLogEntryId },
      select: { loyaltyPointsUsed: true, deletedAt: true },
    });
    if (!existingEntry || existingEntry.deletedAt) {
      throw new BadRequestException(
        'Zapis u dnevnoj knjizi nije pronađen za loyalty popust.',
      );
    }
    if (existingEntry.loyaltyPointsUsed > 0) {
      throw new BadRequestException(
        'Za ovaj zapis su već iskorišteni loyalty bodovi.',
      );
    }

    const programEnabled = await this.isProgramEnabled();
    if (!programEnabled) {
      throw new BadRequestException('Loyalty program trenutno nije aktivan.');
    }

    const redeemEnabled = this.parseBoolean(
      await this.settings.getValue('loyalty_redeem_enabled'),
      false,
    );
    if (!redeemEnabled) {
      throw new BadRequestException(
        'Korištenje bodova trenutno nije omogućeno.',
      );
    }

    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId: clientId },
    });
    if (!account || !account.isActive) {
      throw new BadRequestException('Nemate aktivan loyalty račun.');
    }

    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: {
        id: true,
        price: true,
        loyaltyEnabled: true,
        loyaltyMaxDiscountPercent: true,
      },
    });
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Servis nije pronađen.');
    }
    if (services.some((s) => !s.loyaltyEnabled)) {
      throw new BadRequestException(
        'Za jedan ili više odabranih servisa nije dozvoljen loyalty popust.',
      );
    }

    const sumPrice = services
      .map((s) => Number(s.price))
      .reduce((acc, x) => acc + (Number.isFinite(x) ? x : 0), 0);
    if (!Number.isFinite(sumPrice) || sumPrice <= 0) {
      throw new BadRequestException(
        'Cijena usluge nije validna za loyalty popust.',
      );
    }

    const tier = await this.getTierForPoints(account.points);
    const tierMaxPercent = tier?.maxDiscountPercent ?? 0;
    const serviceMaxPercent = Math.min(
      ...services.map((s) => s.loyaltyMaxDiscountPercent ?? 0),
    );
    const globalMaxPercent = this.parseNumber(
      await this.settings.getValue('loyalty_max_discount_percent'),
      100,
    );
    const allowedPercent = Math.min(
      tierMaxPercent,
      serviceMaxPercent,
      globalMaxPercent,
    );
    if (allowedPercent <= 0) {
      throw new BadRequestException(
        'Vaš nivo ne dozvoljava korištenje bodova za popust.',
      );
    }
    if (desiredPercent > allowedPercent) {
      throw new BadRequestException(
        'Odabrani procenat popusta je veći od maksimalnog dozvoljenog.',
      );
    }

    const redeemRate = this.parseNumber(
      await this.settings.getValue('loyalty_redeem_rate'),
      0.1,
    ); // KM po bodu
    if (redeemRate <= 0) {
      throw new BadRequestException(
        'Loyalty redeem stopa nije ispravno podešena.',
      );
    }

    const desiredDiscountAmount = (sumPrice * desiredPercent) / 100;
    const minCharge = Math.max(0, sumPrice - desiredDiscountAmount);
    const coveredByDebtAmount = Math.max(0, Number(args.coveredByDebtAmount ?? 0));
    const effectivePaid = Number(actualPrice) + coveredByDebtAmount;
    if (!Number.isFinite(effectivePaid) || effectivePaid < minCharge) {
      throw new BadRequestException(
        `Naplaćeni iznos ne može biti manji od preporučene cijene za naplatu (${minCharge.toFixed(2)} KM).`,
      );
    }

    const neededPoints = Math.floor(desiredDiscountAmount / redeemRate);
    const minPoints = this.parseNumber(
      await this.settings.getValue('loyalty_min_points_to_redeem'),
      0,
    );
    if (neededPoints < minPoints) {
      throw new BadRequestException(
        'Broj bodova koji bi se iskoristio je ispod minimalnog za korištenje.',
      );
    }
    if (neededPoints <= 0) {
      throw new BadRequestException(
        'Odabrani popust je prenizak da bi se isplatilo koristiti bodove.',
      );
    }
    if (account.points < neededPoints) {
      throw new BadRequestException(
        'Nemate dovoljno bodova za odabrani popust.',
      );
    }

    const updatedAccount = await this.redeemPoints(
      account.id,
      neededPoints,
      `DailyLog ${dailyLogEntryId} (${desiredPercent}%)`,
    );

    await this.prisma.dailyLogEntry.update({
      where: { id: dailyLogEntryId },
      data: {
        loyaltyDiscountPercent: Math.round(desiredPercent),
        loyaltyDiscountAmount: desiredDiscountAmount,
        loyaltyPointsUsed: neededPoints,
      },
    });

    return updatedAccount;
  }

  async adjustPoints(accountId: string, pointsDelta: number, note?: string) {
    if (!Number.isFinite(pointsDelta) || pointsDelta === 0) {
      throw new BadRequestException(
        'Promjena bodova mora biti različita od nule.',
      );
    }
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { id: accountId },
    });
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

  /**
   * Reverses loyalty side-effects of a daily log entry.
   * EARN points are removed; REDEEM points are restored. Balance is clamped at 0.
   */
  async reverseFromDailyLog(dailyLogEntryId: string): Promise<void> {
    const source = `daily_log:${dailyLogEntryId}`;
    const txs = await this.prisma.loyaltyTransaction.findMany({
      where: { source },
      include: { account: true },
    });
    if (txs.length === 0) return;
    const byAccount = new Map<
      string,
      { accountId: string; delta: number }
    >();
    for (const tx of txs) {
      const current = byAccount.get(tx.accountId) ?? {
        accountId: tx.accountId,
        delta: 0,
      };
      if (tx.type === 'EARN') {
        current.delta -= Math.abs(tx.points);
      } else if (tx.type === 'REDEEM') {
        current.delta += Math.abs(tx.points);
      }
      byAccount.set(tx.accountId, current);
    }
    for (const item of byAccount.values()) {
      const account = await this.prisma.loyaltyAccount.findUnique({
        where: { id: item.accountId },
      });
      if (!account) continue;
      const nextPoints = Math.max(0, account.points + item.delta);
      const appliedDelta = nextPoints - account.points;
      if (appliedDelta === 0 && item.delta === 0) continue;
      await this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { set: nextPoints },
          transactions: {
            create: {
              points: appliedDelta,
              type: 'ADJUST',
              source: `daily_log_reversal:${dailyLogEntryId}`,
            },
          },
        },
      });
      await this.recalculateTier(account.id);
    }
  }
}
