import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const mockPrisma = {
  loyaltyAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  loyaltyTransaction: { create: jest.fn() },
  reservation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn().mockResolvedValue([]),
  appSetting: {
    findMany: jest.fn(),
  },
};

const mockSettings = {
  getValue: jest.fn(),
};

describe('LoyaltyService', () => {
  let service: LoyaltyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SettingsService, useValue: mockSettings },
      ],
    }).compile();
    service = module.get<LoyaltyService>(LoyaltyService);
  });

  describe('earnFromDailyLog', () => {
    it('vraca null kada je program iskljucen', async () => {
      mockSettings.getValue.mockResolvedValueOnce('false');
      const result = await service.earnFromDailyLog({
        id: 'e1',
        clientId: 'u1',
        actualPrice: 50,
        tipAmount: 0,
        serviceId: 'svc1',
      });
      expect(result).toBeNull();
    });

    it('dodjeljuje bodove kada su uslovi ispunjeni', async () => {
      mockSettings.getValue
        .mockResolvedValueOnce('true') // loyalty_enabled
        .mockResolvedValueOnce('1') // loyalty_points_per_currency
        .mockResolvedValueOnce('false') // loyalty_earn_on_tip
        .mockResolvedValueOnce('0') // loyalty_min_amount_for_earn
        .mockResolvedValueOnce('[]'); // loyalty_excluded_services

      mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);
      mockPrisma.loyaltyAccount.create.mockResolvedValue({
        id: 'acc1',
        userId: 'u1',
        points: 0,
      });
      mockPrisma.loyaltyAccount.update.mockResolvedValue({
        id: 'acc1',
        userId: 'u1',
        points: 50,
      });

      const result = await service.earnFromDailyLog({
        id: 'e1',
        clientId: 'u1',
        actualPrice: 50,
        tipAmount: 0,
        serviceId: 'svc1',
      });

      expect(result).not.toBeNull();
      expect(mockPrisma.loyaltyAccount.update).toHaveBeenCalled();
    });
  });

  describe('redeemForReservation', () => {
    it('baca BadRequestException ako su bodovi vec iskoristeni za rezervaciju', async () => {
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res1',
        loyaltyPointsUsed: 10,
      });
      await expect(
        service.redeemForReservation(
          {
            clientId: 'u1',
            reservationId: 'res1',
            serviceId: 'svc1',
            desiredPercent: 10,
          },
          mockPrisma as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('veže debit, ledger i reservation marker za isti transaction client', async () => {
      const values: Record<string, string | null> = {
        loyalty_enabled: 'true',
        loyalty_redeem_enabled: 'true',
        loyalty_tiers: null,
        loyalty_max_discount_percent: '100',
        loyalty_redeem_rate: '0.1',
        loyalty_min_points_to_redeem: '0',
      };
      mockSettings.getValue.mockImplementation((key: string) =>
        Promise.resolve(values[key] ?? null),
      );
      mockPrisma.reservation.findUnique.mockResolvedValue({
        id: 'res1',
        loyaltyPointsUsed: 0,
      });
      mockPrisma.loyaltyAccount.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: 'u1',
        points: 500,
        isActive: true,
      });
      mockPrisma.service.findMany.mockResolvedValue([
        {
          id: 'svc1',
          price: 50,
          loyaltyEnabled: true,
          loyaltyMaxDiscountPercent: 20,
        },
      ]);
      mockPrisma.loyaltyAccount.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'txn1' });
      mockPrisma.loyaltyAccount.update.mockResolvedValue({
        id: 'acc1',
        userId: 'u1',
        points: 450,
        tier: 'Silver',
      });
      mockPrisma.reservation.update.mockResolvedValue({ id: 'res1' });

      const result = await service.redeemForReservation(
        {
          clientId: 'u1',
          reservationId: 'res1',
          serviceIds: ['svc1'],
          desiredPercent: 10,
        },
        mockPrisma as any,
      );

      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
      expect(mockPrisma.loyaltyAccount.updateMany).toHaveBeenCalledWith({
        where: { id: 'acc1', isActive: true, points: { gte: 50 } },
        data: { points: { decrement: 50 } },
      });
      expect(mockPrisma.loyaltyTransaction.create).toHaveBeenCalledWith({
        data: {
          accountId: 'acc1',
          points: 50,
          type: 'REDEEM',
          source: 'Reservation res1 (10%)',
        },
      });
      expect(mockPrisma.loyaltyAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { tier: 'Silver' },
      });
      expect(mockPrisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res1' },
        data: {
          loyaltyDiscountPercent: 10,
          loyaltyDiscountAmount: 5,
          loyaltyPointsUsed: 50,
        },
      });
      expect(result).toMatchObject({ id: 'acc1', points: 450 });
    });
  });
});
