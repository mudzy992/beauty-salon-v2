import { Test, TestingModule } from '@nestjs/testing';
import { DailyLogReceiptService } from './daily-log-receipt.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  dailyLogEntry: {
    findUnique: jest.fn(),
  },
};

const mockNotifications = {
  send: jest.fn(),
  sendPaymentReceiptEmail: jest.fn(),
};

describe('DailyLogReceiptService', () => {
  let service: DailyLogReceiptService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLogReceiptService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get(DailyLogReceiptService);
  });

  it('preskače kada nema clientId', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue({
      id: 'e1',
      kind: 'SERVICE',
      status: 'COMPLETED',
      completionVersion: 1,
      deletedAt: null,
      clientId: null,
      client: null,
    });
    await service.sendPaymentReceiptIfApplicable('e1');
    expect(mockNotifications.send).not.toHaveBeenCalled();
  });

  it('šalje push i email kad je mail verifikovan', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue({
      id: 'e1',
      kind: 'SERVICE',
      status: 'COMPLETED',
      completionVersion: 1,
      deletedAt: null,
      clientId: 'c1',
      reservationId: 'r1',
      publicReferenceCode: 'DK-20260812-ABC123',
      actualPrice: 70,
      tipAmount: 10,
      loyaltyDiscountAmount: 0,
      completedAt: new Date('2026-08-12T10:00:00Z'),
      client: {
        id: 'c1',
        email: 'client@test.com',
        isEmailVerified: true,
        firstName: 'Ana',
      },
      stylistProfile: { user: { firstName: 'Mira', lastName: 'K.' } },
      items: [{ service: { name: 'Šišanje' }, unitPrice: 60 }],
    });
    await service.sendPaymentReceiptIfApplicable('e1', 'outbox-1', 1);
    expect(mockNotifications.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'c1',
        type: 'payment_receipt',
        channel: 'PUSH',
        sourceEventId: 'outbox-1',
        data: expect.objectContaining({
          reservationId: 'r1',
          dailyLogEntryId: 'e1',
        }),
      }),
    );
    expect(mockNotifications.sendPaymentReceiptEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'client@test.com' }),
    );
  });

  it('ne šalje email kad mail nije verifikovan', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue({
      id: 'e1',
      kind: 'SERVICE',
      status: 'COMPLETED',
      completionVersion: 1,
      deletedAt: null,
      clientId: 'c1',
      reservationId: null,
      publicReferenceCode: 'DK-20260812-ABC123',
      actualPrice: 50,
      tipAmount: 0,
      loyaltyDiscountAmount: 0,
      completedAt: new Date(),
      client: {
        id: 'c1',
        email: 'client@test.com',
        isEmailVerified: false,
        firstName: 'Ana',
      },
      stylistProfile: null,
      items: [{ service: { name: 'Farbanje' }, unitPrice: 50 }],
    });
    await service.sendPaymentReceiptIfApplicable('e1');
    expect(mockNotifications.send).toHaveBeenCalled();
    expect(mockNotifications.sendPaymentReceiptEmail).not.toHaveBeenCalled();
  });
});
