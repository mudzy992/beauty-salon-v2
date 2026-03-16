import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/loyalty/client')
@UseGuards(JwtAuthGuard)
export class LoyaltyClientController {
  constructor(
    private readonly loyalty: LoyaltyService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('me')
  async getMyLoyalty(
    @CurrentUser() user: CurrentUserPayload,
    @Query('serviceId') serviceId?: string,
  ) {
    const enabled = await this.loyalty.isProgramEnabled();
    const account = await this.prisma.loyaltyAccount.findUnique({
      where: { userId: user.sub },
    });
    if (!enabled || !account) {
      return {
        enabled,
        hasAccount: false,
      };
    }

    const tiers = await (this as any).loyalty['getTiers']();
    const tier = tiers
      .filter((t: any) => account.points >= t.minPoints)
      .sort((a: any, b: any) => a.minPoints - b.minPoints)
      .slice(-1)[0] ?? null;

    const redeemEnabled = (this as any).loyalty['parseBoolean'](
      await (this as any).loyalty['settings'].getValue('loyalty_redeem_enabled'),
      false,
    );
    const redeemRate = (this as any).loyalty['parseNumber'](
      await (this as any).loyalty['settings'].getValue('loyalty_redeem_rate'),
      0.1,
    );
    const minPoints = (this as any).loyalty['parseNumber'](
      await (this as any).loyalty['settings'].getValue('loyalty_min_points_to_redeem'),
      0,
    );
    const globalMaxPercent = (this as any).loyalty['parseNumber'](
      await (this as any).loyalty['settings'].getValue('loyalty_max_discount_percent'),
      100,
    );

    if (serviceId) {
      const service = await this.prisma.service.findUnique({
        where: { id: serviceId },
        select: { price: true, loyaltyEnabled: true, loyaltyMaxDiscountPercent: true },
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
          maxUsablePoints = Math.max(
            0,
            Math.min(maxByPercent, account.points),
          );
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
}

