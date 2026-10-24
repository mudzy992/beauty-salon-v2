import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

type LoyaltyTier = {
  id: string;
  name: string;
  minPoints: number;
  maxDiscountPercent?: number;
};

type LoyaltyMutationType = 'EARN' | 'REDEEM' | 'ADJUST';
type LoyaltyMutation = {
  accountId: string;
  balanceDelta: number;
  ledgerPoints: number | 'applied-delta';
  type: LoyaltyMutationType;
  source: string;
  idempotencyKey: string;
  clampNegativeBalance?: boolean;
  allowZeroLedgerEntry?: boolean;
};

type LoyaltyMarker = {
  id: string;
  clientId: string | null;
  loyaltyPointsUsed: number;
};

const MAX_LOYALTY_POINTS = 2_147_483_647;

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

  private toDecimal(value: unknown, fallback = '0'): Prisma.Decimal {
    const raw = value == null || value === '' ? fallback : String(value);
    try {
      const decimal = new Prisma.Decimal(raw);
      return decimal.isFinite() ? decimal : new Prisma.Decimal(fallback);
    } catch {
      return new Prisma.Decimal(fallback);
    }
  }

  /**
   * Loyalty price policy: round the requested percent discount to two decimals
   * using half-up, then floor requestedAmount / KM-per-point to whole points.
   * Finally, cap the stored discount at min(requestedAmount, rounded point value).
   * This guarantees the cash discount never exceeds the value of points debited.
   */
  private roundMoney(value: Prisma.Decimal): Prisma.Decimal {
    return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  }

  private toSafePointCount(value: Prisma.Decimal, description: string): number {
    const points = value.toNumber();
    if (
      !Number.isSafeInteger(points) ||
      points < 0 ||
      points > MAX_LOYALTY_POINTS
    ) {
      throw new BadRequestException(`${description} nije validan broj bodova.`);
    }
    return points;
  }

  private pointsForDiscount(
    discountAmount: Prisma.Decimal,
    redeemRate: Prisma.Decimal,
  ): number {
    return this.toSafePointCount(
      discountAmount.div(redeemRate).floor(),
      'Redeem',
    );
  }

  private capDiscountToRedeemedPoints(
    requestedAmount: Prisma.Decimal,
    points: number,
    redeemRate: Prisma.Decimal,
  ): Prisma.Decimal {
    const pointValue = this.roundMoney(redeemRate.mul(points));
    return pointValue.lt(requestedAmount) ? pointValue : requestedAmount;
  }

  private async lockLoyaltyAccount(
    tx: Prisma.TransactionClient,
    accountId: string,
  ): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "loyalty_accounts" WHERE id = ${accountId} FOR UPDATE`,
    );
  }

  private async lockLoyaltyAccountForUser(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "loyalty_accounts" WHERE "user_id" = ${userId} FOR UPDATE`,
    );
  }

  private async findIdempotentMutation(
    tx: Prisma.TransactionClient,
    mutation: LoyaltyMutation,
  ) {
    const existing = await tx.loyaltyTransaction.findUnique({
      where: { idempotencyKey: mutation.idempotencyKey },
    });
    if (!existing) return null;

    const pointsMatch =
      mutation.ledgerPoints === 'applied-delta' ||
      existing.points === mutation.ledgerPoints;
    if (
      existing.accountId !== mutation.accountId ||
      existing.type !== mutation.type ||
      existing.source !== mutation.source ||
      !pointsMatch
    ) {
      throw new ConflictException(
        'Idempotency key je već korišten za drugačiju loyalty transakciju.',
      );
    }

    const account = await tx.loyaltyAccount.findUnique({
      where: { id: mutation.accountId },
    });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    return account;
  }

  private async applyPointMutation(
    tx: Prisma.TransactionClient,
    mutation: LoyaltyMutation,
  ) {
    if (!mutation.idempotencyKey.trim()) {
      throw new BadRequestException('Loyalty idempotency key je obavezan.');
    }
    if (!Number.isSafeInteger(mutation.balanceDelta)) {
      throw new BadRequestException('Promjena bodova mora biti cijeli broj.');
    }
    if (
      mutation.ledgerPoints !== 'applied-delta' &&
      !Number.isSafeInteger(mutation.ledgerPoints)
    ) {
      throw new BadRequestException('Ledger bodovi moraju biti cijeli broj.');
    }

    await this.lockLoyaltyAccount(tx, mutation.accountId);
    const replay = await this.findIdempotentMutation(tx, mutation);
    if (replay) return replay;

    const account = await tx.loyaltyAccount.findUnique({
      where: { id: mutation.accountId },
    });
    if (!account) throw new NotFoundException('Loyalty račun nije pronađen.');
    if (mutation.type === 'REDEEM' && !account.isActive) {
      throw new BadRequestException('Loyalty račun nije aktivan.');
    }
    if (mutation.balanceDelta === 0 && !mutation.allowZeroLedgerEntry) {
      throw new BadRequestException(
        'Promjena bodova mora biti različita od nule.',
      );
    }

    const proposed = account.points + mutation.balanceDelta;
    const nextPoints = mutation.clampNegativeBalance
      ? Math.max(0, proposed)
      : proposed;
    if (nextPoints < 0) {
      throw new BadRequestException('Nedovoljno bodova.');
    }
    if (!Number.isSafeInteger(nextPoints) || nextPoints > MAX_LOYALTY_POINTS) {
      throw new BadRequestException('Saldo prelazi dozvoljeni broj bodova.');
    }

    const appliedDelta = nextPoints - account.points;
    const ledgerPoints =
      mutation.ledgerPoints === 'applied-delta'
        ? appliedDelta
        : mutation.ledgerPoints;
    if (ledgerPoints === 0 && !mutation.allowZeroLedgerEntry) {
      throw new BadRequestException(
        'Promjena bodova mora biti različita od nule.',
      );
    }

    if (nextPoints !== account.points) {
      const updated = await tx.loyaltyAccount.updateMany({
        where: { id: account.id, points: account.points },
        data: { points: { set: nextPoints } },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Loyalty saldo je promijenjen tokom obrade; pokušajte ponovo.',
        );
      }
    }

    await tx.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        points: ledgerPoints,
        type: mutation.type,
        source: mutation.source,
        idempotencyKey: mutation.idempotencyKey,
      },
    });
    if (appliedDelta !== 0) await this.recalculateTier(account.id, tx);

    const updatedAccount = await tx.loyaltyAccount.findUnique({
      where: { id: account.id },
    });
    if (!updatedAccount) {
      throw new NotFoundException('Loyalty račun nije pronađen.');
    }
    return updatedAccount;
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

  private async recalculateTier(
    accountId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    const account = await db.loyaltyAccount.findUnique({
      where: { id: accountId },
      select: { id: true, points: true },
    });
    if (!account) return;
    const tiers = await this.getTiers();
    const eligible = tiers.filter((t) => account.points >= t.minPoints);
    const currentTier =
      eligible.length > 0 ? eligible[eligible.length - 1] : null;
    await db.loyaltyAccount.update({
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
   * Earn points for one daily-log completion generation. The optional tx lets
   * completion keep the balance, ledger row and completion state atomic.
   */
  async earnFromDailyLog(
    entry: {
      id: string;
      clientId: string | null;
      actualPrice: number;
      tipAmount: number;
      serviceId: string;
      idempotencyKey?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) return this.earnFromDailyLogInTransaction(entry, tx);
    return this.prisma.$transaction((transaction) =>
      this.earnFromDailyLogInTransaction(entry, transaction),
    );
  }

  private async earnFromDailyLogInTransaction(
    entry: {
      id: string;
      clientId: string | null;
      actualPrice: number;
      tipAmount: number;
      serviceId: string;
      idempotencyKey?: string;
    },
    tx: Prisma.TransactionClient,
  ) {
    const idempotencyKey =
      entry.idempotencyKey ?? `daily-log.earn:${entry.id}:v1`;
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${entry.id} FOR UPDATE`,
    );

    const existing = await tx.loyaltyTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      const existingAccount = await tx.loyaltyAccount.findUnique({
        where: { id: existing.accountId },
        select: { id: true, userId: true },
      });
      if (
        existing.type !== 'EARN' ||
        existing.source !== `daily_log:${entry.id}` ||
        !existingAccount ||
        existingAccount.userId !== entry.clientId
      ) {
        throw new ConflictException(
          'Loyalty earn idempotency key ne odgovara ovom dnevnom zapisu.',
        );
      }
      return tx.loyaltyAccount.findUnique({
        where: { id: existing.accountId },
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

    const actualPrice = this.toDecimal(entry.actualPrice);
    if (!entry.clientId || !actualPrice.gt(0)) return null;
    const enabled = await this.isProgramEnabled();
    if (!enabled) return null;

    const pointsPerCurrency = this.toDecimal(
      await this.settings.getValue('loyalty_points_per_currency'),
      '1',
    );
    const earnOnTip = this.parseBoolean(
      await this.settings.getValue('loyalty_earn_on_tip'),
      false,
    );
    const minAmount = this.toDecimal(
      await this.settings.getValue('loyalty_min_amount_for_earn'),
      '0',
    );
    const excludedRaw = await this.settings.getValue(
      'loyalty_excluded_services',
    );
    const excluded: string[] = this.parseJsonArray<string>(excludedRaw, []);

    if (excluded.includes(entry.serviceId)) return null;

    const tipAmount = this.toDecimal(entry.tipAmount);
    const baseAmount = actualPrice.plus(earnOnTip ? tipAmount : 0);
    if (baseAmount.lt(minAmount)) return null;

    const rawPointsDecimal = baseAmount.mul(pointsPerCurrency).floor();
    if (!rawPointsDecimal.gt(0)) return null;
    const rawPoints = this.toSafePointCount(rawPointsDecimal, 'Earn bodova');

    const account = await tx.loyaltyAccount.upsert({
      where: { userId: entry.clientId },
      create: { userId: entry.clientId, isActive: true },
      update: {},
      select: { id: true },
    });
    await this.applyPointMutation(tx, {
      accountId: account.id,
      balanceDelta: rawPoints,
      ledgerPoints: rawPoints,
      type: 'EARN',
      source: `daily_log:${entry.id}`,
      idempotencyKey,
    });
    return tx.loyaltyAccount.findUnique({
      where: { id: account.id },
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
    const redeemRateDecimal = this.toDecimal(
      await this.settings.getValue('loyalty_redeem_rate'),
      '0.1',
    );
    const redeemRate = redeemRateDecimal.toNumber();
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
      if (
        services.length !== normalizedServiceIds.length ||
        services.some((s) => !s.loyaltyEnabled)
      ) {
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

      const sumPriceDecimal = services.reduce(
        (total, item) => total.plus(this.toDecimal(item.price)),
        new Prisma.Decimal(0),
      );
      const sumPrice = sumPriceDecimal.toNumber();
      const tierMax = tier?.maxDiscountPercent ?? 0;
      const serviceMax = Math.min(
        ...services.map((s) => s.loyaltyMaxDiscountPercent ?? 0),
      );
      const maxPercentForService = Math.min(
        tierMax,
        serviceMax,
        globalMaxPercent,
      );

      let maxDiscountAmount = 0;
      let maxUsablePoints = 0;
      if (
        sumPriceDecimal.gt(0) &&
        maxPercentForService > 0 &&
        redeemRateDecimal.gt(0)
      ) {
        const requestedMaxDiscount = this.roundMoney(
          sumPriceDecimal.mul(maxPercentForService).div(100),
        );
        const maxByPercent = this.pointsForDiscount(
          requestedMaxDiscount,
          redeemRateDecimal,
        );
        maxUsablePoints = Math.max(0, Math.min(maxByPercent, account.points));
        maxDiscountAmount = this.capDiscountToRedeemedPoints(
          requestedMaxDiscount,
          maxUsablePoints,
          redeemRateDecimal,
        ).toNumber();
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

      const servicePriceDecimal = this.toDecimal(service.price);
      const servicePrice = servicePriceDecimal.toNumber();
      let maxPercentForService = 0;
      let maxDiscountAmount = 0;
      let maxUsablePoints = 0;

      if (servicePriceDecimal.gt(0)) {
        const tierMax = tier?.maxDiscountPercent ?? 0;
        const serviceMax = service.loyaltyMaxDiscountPercent ?? 0;
        maxPercentForService = Math.min(tierMax, serviceMax, globalMaxPercent);
        if (maxPercentForService > 0 && redeemRateDecimal.gt(0)) {
          const requestedMaxDiscount = this.roundMoney(
            servicePriceDecimal.mul(maxPercentForService).div(100),
          );
          const maxByPercent = this.pointsForDiscount(
            requestedMaxDiscount,
            redeemRateDecimal,
          );
          maxUsablePoints = Math.max(0, Math.min(maxByPercent, account.points));
          maxDiscountAmount = this.capDiscountToRedeemedPoints(
            requestedMaxDiscount,
            maxUsablePoints,
            redeemRateDecimal,
          ).toNumber();
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

  async redeemPoints(
    accountId: string,
    points: number,
    reason: string | undefined,
    requestIdempotencyKey: string,
  ) {
    if (
      !Number.isSafeInteger(points) ||
      points <= 0 ||
      points > MAX_LOYALTY_POINTS
    ) {
      throw new BadRequestException(
        'Broj bodova mora biti pozitivan cijeli broj.',
      );
    }
    const source = reason?.trim() || 'Manual redeem';
    const idempotencyKey = `loyalty.manual.redeem:${requestIdempotencyKey}`;

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoyaltyAccount(tx, accountId);
      const replay = await this.findIdempotentMutation(tx, {
        accountId,
        balanceDelta: -points,
        ledgerPoints: points,
        type: 'REDEEM',
        source,
        idempotencyKey,
      });
      if (replay) return replay;

      const enabled = this.parseBoolean(
        await this.settings.getValue('loyalty_redeem_enabled'),
        false,
      );
      if (!enabled) {
        throw new BadRequestException('Redeem je trenutno onemogućen.');
      }
      const minPoints = this.parseNumber(
        await this.settings.getValue('loyalty_min_points_to_redeem'),
        0,
      );
      if (points < minPoints) {
        throw new BadRequestException(
          'Broj bodova je ispod minimalnog za korištenje.',
        );
      }

      return this.applyPointMutation(tx, {
        accountId,
        balanceDelta: -points,
        ledgerPoints: points,
        type: 'REDEEM',
        source,
        idempotencyKey,
      });
    });
  }

  /**
   * Redeem bodova za konkretnu rezervaciju, uz provjeru maksimalnog popusta po tieru, servisu i globalno.
   */
  async redeemForReservation(
    args: {
      clientId: string;
      reservationId: string;
      serviceId?: string;
      serviceIds?: string[];
      desiredPercent: number;
    },
    db: Prisma.TransactionClient,
  ) {
    const { clientId, reservationId, desiredPercent } = args;
    const idsRaw =
      args.serviceIds && args.serviceIds.length > 0
        ? args.serviceIds
        : args.serviceId
          ? [args.serviceId]
          : [];
    const serviceIds = [
      ...new Set(idsRaw.map((x) => x.trim()).filter(Boolean)),
    ];
    if (!Number.isInteger(desiredPercent) || !Number.isFinite(desiredPercent)) {
      throw new BadRequestException('Procenat popusta mora biti cijeli broj.');
    }
    if (desiredPercent <= 0) return null;
    if (serviceIds.length === 0) {
      throw new NotFoundException('Servis nije pronađen.');
    }

    const source = `Reservation ${reservationId} (${desiredPercent}%)`;
    const idempotencyKey = `loyalty.reservation.redeem:${reservationId}:v1`;
    await db.$queryRaw(
      Prisma.sql`SELECT id FROM "reservations" WHERE id = ${reservationId} FOR UPDATE`,
    );
    await this.lockLoyaltyAccountForUser(db, clientId);

    const existingReservation = await db.reservation.findUnique({
      where: { id: reservationId },
      select: { clientId: true, loyaltyPointsUsed: true },
    });
    if (!existingReservation) {
      throw new BadRequestException(
        'Rezervacija nije pronađena za loyalty popust.',
      );
    }
    if (existingReservation.clientId !== clientId) {
      throw new ConflictException(
        'Klijent rezervacije ne odgovara loyalty računu.',
      );
    }
    const account = await db.loyaltyAccount.findUnique({
      where: { userId: clientId },
    });
    if (!account) {
      throw new BadRequestException('Nemate aktivan loyalty račun.');
    }

    const existingTransaction = await db.loyaltyTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTransaction) {
      if (
        existingTransaction.accountId !== account.id ||
        existingTransaction.type !== 'REDEEM' ||
        existingTransaction.source !== source ||
        existingTransaction.points !== existingReservation.loyaltyPointsUsed
      ) {
        throw new ConflictException(
          'Loyalty rezervacije i evidencija bodova nisu usklađeni.',
        );
      }
      return account;
    }
    if (existingReservation.loyaltyPointsUsed > 0) {
      const legacyTransactions = await db.loyaltyTransaction.findMany({
        where: { accountId: account.id, type: 'REDEEM', source },
      });
      if (
        legacyTransactions.length === 1 &&
        legacyTransactions[0]!.points === existingReservation.loyaltyPointsUsed
      ) {
        return account;
      }
      throw new ConflictException(
        'Za rezervaciju postoje bodovi bez jedinstvene loyalty evidencije.',
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

    if (!account.isActive) {
      throw new BadRequestException('Nemate aktivan loyalty račun.');
    }

    const services = await db.service.findMany({
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
    const sumPrice = services.reduce(
      (total, item) => total.plus(this.toDecimal(item.price)),
      new Prisma.Decimal(0),
    );
    if (!sumPrice.gt(0)) {
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

    const redeemRate = this.toDecimal(
      await this.settings.getValue('loyalty_redeem_rate'),
      '0.1',
    ); // KM po bodu
    if (!redeemRate.gt(0)) {
      throw new BadRequestException(
        'Loyalty redeem stopa nije ispravno podešena.',
      );
    }

    const requestedDiscountAmount = this.roundMoney(
      sumPrice.mul(desiredPercent).div(100),
    );
    const neededPoints = this.pointsForDiscount(
      requestedDiscountAmount,
      redeemRate,
    );
    const desiredDiscountAmount = this.capDiscountToRedeemedPoints(
      requestedDiscountAmount,
      neededPoints,
      redeemRate,
    );

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

    const updatedAccount = await this.applyPointMutation(db, {
      accountId: account.id,
      balanceDelta: -neededPoints,
      ledgerPoints: neededPoints,
      type: 'REDEEM',
      source,
      idempotencyKey,
    });

    const marker = await db.reservation.updateMany({
      where: { id: reservationId, loyaltyPointsUsed: 0 },
      data: {
        loyaltyDiscountPercent: Math.round(desiredPercent),
        loyaltyDiscountAmount: desiredDiscountAmount,
        loyaltyPointsUsed: neededPoints,
      },
    });
    if (marker.count !== 1) {
      throw new ConflictException(
        'Rezervacija je već dobila loyalty popust ili je izmijenjena tokom obrade.',
      );
    }

    return updatedAccount;
  }

  /**
   * Redeem bodova za ručni zapis u dnevnoj knjizi, uz pravila identična rezervaciji.
   * Popust se računa na osnovu cijene servisa, a zapis u dnevniku mora imati actualPrice >= (price - popust).
   */
  async redeemForDailyLog(
    args: {
      clientId: string;
      dailyLogEntryId: string;
      serviceId?: string;
      serviceIds?: string[];
      desiredPercent: number;
      actualPrice: number;
      coveredByDebtAmount?: number;
    },
    tx?: Prisma.TransactionClient,
  ) {
    if (tx) return this.redeemForDailyLogInTransaction(args, tx);
    return this.prisma.$transaction((transaction) =>
      this.redeemForDailyLogInTransaction(args, transaction),
    );
  }

  private async redeemForDailyLogInTransaction(
    args: {
      clientId: string;
      dailyLogEntryId: string;
      serviceId?: string;
      serviceIds?: string[];
      desiredPercent: number;
      actualPrice: number;
      coveredByDebtAmount?: number;
    },
    tx: Prisma.TransactionClient,
  ) {
    const { clientId, dailyLogEntryId, desiredPercent, actualPrice } = args;
    if (!Number.isInteger(desiredPercent) || !Number.isFinite(desiredPercent)) {
      throw new BadRequestException('Procenat popusta mora biti cijeli broj.');
    }
    if (desiredPercent <= 0) return null;

    const idsRaw =
      args.serviceIds && args.serviceIds.length > 0
        ? args.serviceIds
        : args.serviceId
          ? [args.serviceId]
          : [];
    const serviceIds = [
      ...new Set(idsRaw.map((x) => x.trim()).filter(Boolean)),
    ];
    if (serviceIds.length === 0) {
      throw new NotFoundException('Servis nije pronađen.');
    }

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${dailyLogEntryId} FOR UPDATE`,
    );
    const existingEntry = await tx.dailyLogEntry.findUnique({
      where: { id: dailyLogEntryId },
      select: {
        id: true,
        clientId: true,
        status: true,
        deletedAt: true,
        loyaltyDiscountPercent: true,
        loyaltyDiscountAmount: true,
        loyaltyPointsUsed: true,
        items: { select: { serviceId: true, unitPrice: true } },
      },
    });
    if (!existingEntry || existingEntry.deletedAt) {
      throw new BadRequestException(
        'Zapis u dnevnoj knjizi nije pronađen za loyalty popust.',
      );
    }
    if (existingEntry.clientId !== clientId) {
      throw new ConflictException(
        'Klijent dnevnog zapisa ne odgovara loyalty računu.',
      );
    }

    const source = `DailyLog ${dailyLogEntryId} (${desiredPercent}%)`;
    const idempotencyKey = `loyalty.daily-log.redeem:${dailyLogEntryId}:v1`;
    await this.lockLoyaltyAccountForUser(tx, clientId);
    const account = await tx.loyaltyAccount.findUnique({
      where: { userId: clientId },
    });
    const existingTransaction = await tx.loyaltyTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existingTransaction) {
      if (
        !account ||
        existingTransaction.accountId !== account.id ||
        existingTransaction.type !== 'REDEEM' ||
        existingTransaction.source !== source ||
        existingTransaction.points !== existingEntry.loyaltyPointsUsed ||
        existingEntry.loyaltyPointsUsed <= 0
      ) {
        throw new ConflictException(
          'Loyalty popust i evidencija bodova za dnevni zapis nisu usklađeni.',
        );
      }
      return account;
    }
    if (existingEntry.loyaltyPointsUsed > 0) {
      const legacyTransactions = account
        ? await tx.loyaltyTransaction.findMany({
            where: { accountId: account.id, type: 'REDEEM', source },
          })
        : [];
      if (
        account &&
        legacyTransactions.length === 1 &&
        legacyTransactions[0]!.points === existingEntry.loyaltyPointsUsed
      ) {
        return account;
      }
      throw new ConflictException(
        'Dnevni zapis ima loyalty marker bez jedinstvene evidencije bodova.',
      );
    }
    if (existingEntry.status !== 'PENDING') {
      throw new BadRequestException(
        'Loyalty popust se može primijeniti samo na zapis na čekanju.',
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
    if (!account || !account.isActive) {
      throw new BadRequestException('Nemate aktivan loyalty račun.');
    }

    const services = await tx.service.findMany({
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
    const dailyLogUnitPrices = new Map(
      existingEntry.items.map((item) => [
        item.serviceId,
        this.toDecimal(item.unitPrice),
      ]),
    );
    const sumPrice = services.reduce(
      (total, item) =>
        total.plus(
          dailyLogUnitPrices.get(item.id) ?? this.toDecimal(item.price),
        ),
      new Prisma.Decimal(0),
    );
    if (!sumPrice.gt(0)) {
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

    const redeemRate = this.toDecimal(
      await this.settings.getValue('loyalty_redeem_rate'),
      '0.1',
    ); // KM po bodu
    if (!redeemRate.gt(0)) {
      throw new BadRequestException(
        'Loyalty redeem stopa nije ispravno podešena.',
      );
    }
    const requestedDiscountAmount = this.roundMoney(
      sumPrice.mul(desiredPercent).div(100),
    );
    const neededPoints = this.pointsForDiscount(
      requestedDiscountAmount,
      redeemRate,
    );
    const discountAmount = this.capDiscountToRedeemedPoints(
      requestedDiscountAmount,
      neededPoints,
      redeemRate,
    );
    const minCharge = sumPrice.minus(discountAmount).gt(0)
      ? sumPrice.minus(discountAmount)
      : new Prisma.Decimal(0);
    const actualPaid = this.toDecimal(actualPrice);
    const coveredByDebt = this.toDecimal(args.coveredByDebtAmount ?? 0);
    const effectivePaid = actualPaid.plus(
      coveredByDebt.lt(0) ? new Prisma.Decimal(0) : coveredByDebt,
    );
    if (effectivePaid.lt(minCharge)) {
      throw new BadRequestException(
        `Naplaćeni iznos ne može biti manji od preporučene cijene za naplatu (${minCharge.toFixed(2)} KM).`,
      );
    }

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

    const updatedAccount = await this.applyPointMutation(tx, {
      accountId: account.id,
      balanceDelta: -neededPoints,
      ledgerPoints: neededPoints,
      type: 'REDEEM',
      source,
      idempotencyKey,
    });
    const marker = await tx.dailyLogEntry.updateMany({
      where: {
        id: dailyLogEntryId,
        status: 'PENDING',
        deletedAt: null,
        loyaltyPointsUsed: 0,
      },
      data: {
        loyaltyDiscountPercent: Math.round(desiredPercent),
        loyaltyDiscountAmount: discountAmount,
        loyaltyPointsUsed: neededPoints,
      },
    });
    if (marker.count !== 1) {
      throw new ConflictException(
        'Dnevni zapis je izmijenjen tokom primjene loyalty popusta.',
      );
    }
    return updatedAccount;
  }

  async adjustPoints(
    accountId: string,
    pointsDelta: number,
    note: string | undefined,
    requestIdempotencyKey: string,
  ) {
    if (
      !Number.isSafeInteger(pointsDelta) ||
      pointsDelta === 0 ||
      Math.abs(pointsDelta) > MAX_LOYALTY_POINTS
    ) {
      throw new BadRequestException(
        'Promjena bodova mora biti različit od nule i cijeli broj.',
      );
    }
    const source = note?.trim() || 'Admin adjust';
    const idempotencyKey = `loyalty.manual.adjust:${requestIdempotencyKey}`;

    return this.prisma.$transaction((tx) =>
      this.applyPointMutation(tx, {
        accountId,
        balanceDelta: pointsDelta,
        ledgerPoints: pointsDelta,
        type: 'ADJUST',
        source,
        idempotencyKey,
      }),
    );
  }

  /**
   * Reverses daily-log EARN/REDEEM rows exactly once per original transaction.
   * Earn reversal is clamped at zero; each applied delta is written to the ledger.
   */
  async reverseFromDailyLog(
    dailyLogEntryId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (tx) return this.reverseFromDailyLogInTransaction(dailyLogEntryId, tx);
    return this.prisma.$transaction((transaction) =>
      this.reverseFromDailyLogInTransaction(dailyLogEntryId, transaction),
    );
  }

  private async reverseFromDailyLogInTransaction(
    dailyLogEntryId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${dailyLogEntryId} FOR UPDATE`,
    );
    const transactions = await tx.loyaltyTransaction.findMany({
      where: {
        OR: [
          { type: 'EARN', source: `daily_log:${dailyLogEntryId}` },
          {
            type: 'REDEEM',
            source: { startsWith: `DailyLog ${dailyLogEntryId} (` },
          },
        ],
      },
      select: { id: true, accountId: true, points: true, type: true },
      orderBy: [{ accountId: 'asc' }, { id: 'asc' }],
    });

    for (const original of transactions) {
      if (original.type !== 'EARN' && original.type !== 'REDEEM') continue;
      const points = Math.abs(original.points);
      const balanceDelta = original.type === 'EARN' ? -points : points;
      await this.applyPointMutation(tx, {
        accountId: original.accountId,
        balanceDelta,
        ledgerPoints: 'applied-delta',
        type: 'ADJUST',
        source: `daily_log_reversal:${dailyLogEntryId}`,
        idempotencyKey: `loyalty.daily-log.reversal:${original.id}:v1`,
        clampNegativeBalance: original.type === 'EARN',
        allowZeroLedgerEntry: true,
      });
    }
  }

  /** Read-only balance and marker reconciliation; this method never repairs data. */
  async getReconciliationReport() {
    const [
      accounts,
      ledgerGroups,
      reservations,
      dailyLogEntries,
      redemptionTransactions,
    ] = await this.prisma.$transaction(
      (tx) =>
        Promise.all([
          tx.loyaltyAccount.findMany({
            select: { id: true, userId: true, points: true },
          }),
          tx.loyaltyTransaction.groupBy({
            by: ['accountId', 'type'],
            _sum: { points: true },
          }),
          tx.reservation.findMany({
            where: { loyaltyPointsUsed: { gt: 0 } },
            select: { id: true, clientId: true, loyaltyPointsUsed: true },
          }),
          tx.dailyLogEntry.findMany({
            where: { loyaltyPointsUsed: { gt: 0 } },
            select: { id: true, clientId: true, loyaltyPointsUsed: true },
          }),
          tx.loyaltyTransaction.findMany({
            where: {
              type: 'REDEEM',
              OR: [
                {
                  idempotencyKey: {
                    startsWith: 'loyalty.reservation.redeem:',
                  },
                },
                {
                  idempotencyKey: { startsWith: 'loyalty.daily-log.redeem:' },
                },
                { source: { startsWith: 'Reservation ' } },
                { source: { startsWith: 'DailyLog ' } },
              ],
            },
            select: {
              id: true,
              accountId: true,
              points: true,
              type: true,
              source: true,
              idempotencyKey: true,
            },
          }),
        ]),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );

    const expectedBalances = new Map<string, number>();
    const unknownTypes = new Map<string, Set<string>>();
    for (const row of ledgerGroups) {
      const amount = row._sum.points ?? 0;
      const previous = expectedBalances.get(row.accountId) ?? 0;
      if (row.type === 'EARN') {
        expectedBalances.set(row.accountId, previous + amount);
      } else if (row.type === 'REDEEM') {
        expectedBalances.set(row.accountId, previous - Math.abs(amount));
      } else if (row.type === 'ADJUST') {
        expectedBalances.set(row.accountId, previous + amount);
      } else {
        const types = unknownTypes.get(row.accountId) ?? new Set<string>();
        types.add(row.type);
        unknownTypes.set(row.accountId, types);
      }
    }

    const negativeBalances = accounts
      .filter((account) => account.points < 0)
      .map((account) => ({ accountId: account.id, points: account.points }));
    const ledgerBalanceMismatches = accounts.flatMap((account) => {
      if (unknownTypes.has(account.id)) return [];
      const ledgerPoints = expectedBalances.get(account.id) ?? 0;
      return account.points === ledgerPoints
        ? []
        : [
            {
              accountId: account.id,
              points: account.points,
              ledgerPoints,
              difference: account.points - ledgerPoints,
            },
          ];
    });

    const accountIdByUserId = new Map(
      accounts.map((account) => [account.userId, account.id]),
    );
    const reservationById = new Map(reservations.map((row) => [row.id, row]));
    const dailyLogById = new Map(dailyLogEntries.map((row) => [row.id, row]));
    const transactionResource = (
      transaction: (typeof redemptionTransactions)[number],
    ) => {
      const reservationId =
        transaction.idempotencyKey?.match(
          /^loyalty\.reservation\.redeem:(.+):v1$/,
        )?.[1] ?? transaction.source?.match(/^Reservation ([^ ]+) \(/)?.[1];
      if (reservationId) {
        return { type: 'RESERVATION' as const, id: reservationId };
      }
      const dailyLogId =
        transaction.idempotencyKey?.match(
          /^loyalty\.daily-log\.redeem:(.+):v1$/,
        )?.[1] ?? transaction.source?.match(/^DailyLog ([^ ]+) \(/)?.[1];
      if (dailyLogId) return { type: 'DAILY_LOG' as const, id: dailyLogId };
      return null;
    };
    const resourceTransactions = redemptionTransactions.flatMap(
      (transaction) => {
        const resource = transactionResource(transaction);
        return resource ? [{ transaction, resource }] : [];
      },
    );

    const reservationMarkersWithoutTransaction: Array<Record<string, unknown>> =
      [];
    const dailyLogMarkersWithoutTransaction: Array<Record<string, unknown>> =
      [];
    const matchedTransactionIds = new Set<string>();

    const reconcileMarkers = (
      rows: LoyaltyMarker[],
      resourceType: 'RESERVATION' | 'DAILY_LOG',
      issues: Array<Record<string, unknown>>,
    ) => {
      for (const marker of rows) {
        const accountId = marker.clientId
          ? accountIdByUserId.get(marker.clientId)
          : undefined;
        const candidates = resourceTransactions.filter(
          ({ transaction, resource }) =>
            resource.type === resourceType && resource.id === marker.id,
        );
        const matching = candidates.filter(
          ({ transaction }) =>
            transaction.accountId === accountId &&
            transaction.points === marker.loyaltyPointsUsed,
        );
        if (matching.length === 1) {
          matchedTransactionIds.add(matching[0]!.transaction.id);
        } else {
          issues.push({
            resourceId: marker.id,
            accountId: accountId ?? null,
            markerPoints: marker.loyaltyPointsUsed,
            candidateTransactionCount: candidates.length,
            reason:
              candidates.length === 0
                ? 'MISSING_REDEEM_TRANSACTION'
                : 'REDEEM_TRANSACTION_MISMATCH_OR_DUPLICATE',
          });
        }
      }
    };

    reconcileMarkers(
      reservations,
      'RESERVATION',
      reservationMarkersWithoutTransaction,
    );
    reconcileMarkers(
      dailyLogEntries,
      'DAILY_LOG',
      dailyLogMarkersWithoutTransaction,
    );

    const reservationTransactionsWithoutMarker: Array<Record<string, unknown>> =
      [];
    const dailyLogTransactionsWithoutMarker: Array<Record<string, unknown>> =
      [];
    for (const { transaction, resource } of resourceTransactions) {
      if (matchedTransactionIds.has(transaction.id)) continue;
      const marker =
        resource.type === 'RESERVATION'
          ? reservationById.get(resource.id)
          : dailyLogById.get(resource.id);
      const issue = {
        transactionId: transaction.id,
        resourceId: resource.id,
        accountId: transaction.accountId,
        transactionPoints: transaction.points,
        markerPoints: marker?.loyaltyPointsUsed ?? 0,
      };
      if (resource.type === 'RESERVATION') {
        reservationTransactionsWithoutMarker.push(issue);
      } else {
        dailyLogTransactionsWithoutMarker.push(issue);
      }
    }

    return {
      isReadOnly: true,
      generatedAt: new Date().toISOString(),
      summary: {
        accountsChecked: accounts.length,
        negativeBalanceCount: negativeBalances.length,
        ledgerBalanceMismatchCount: ledgerBalanceMismatches.length,
        reservationMarkerIssueCount:
          reservationMarkersWithoutTransaction.length,
        reservationTransactionIssueCount:
          reservationTransactionsWithoutMarker.length,
        dailyLogMarkerIssueCount: dailyLogMarkersWithoutTransaction.length,
        dailyLogTransactionIssueCount: dailyLogTransactionsWithoutMarker.length,
        accountsWithUnknownLedgerTypes: unknownTypes.size,
      },
      negativeBalances,
      ledgerBalanceMismatches,
      accountsWithUnknownLedgerTypes: [...unknownTypes].map(
        ([accountId, types]) => ({ accountId, types: [...types] }),
      ),
      reservationMarkersWithoutTransaction,
      reservationTransactionsWithoutMarker,
      dailyLogMarkersWithoutTransaction,
      dailyLogTransactionsWithoutMarker,
    };
  }
}
