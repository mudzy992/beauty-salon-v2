import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

const mockPrisma = {
  loyaltyAccount: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  reservation: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
  },
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
      mockPrisma.loyaltyAccount.create.mockResolvedValue({ id: 'acc1', userId: 'u1', points: 0 });
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
        service.redeemForReservation({
          clientId: 'u1',
          reservationId: 'res1',
          serviceId: 'svc1',
          desiredPercent: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

