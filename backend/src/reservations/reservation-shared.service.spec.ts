import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';

describe('ReservationSharedService', () => {
  let service: ReservationSharedService;
  const prisma = {
    $transaction: jest.fn(),
    clientCancellationCount: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    prisma.clientCancellationCount.upsert.mockResolvedValue({
      userId: 'client-1',
      cancellationCount: 3,
    });
    prisma.clientCancellationCount.update.mockResolvedValue({
      userId: 'client-1',
      cancellationCount: 3,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationSharedService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ReservationDateService,
          useValue: {
            addSalonCalendarDays: jest.fn(
              (date: Date, days: number) =>
                new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
            ),
          },
        },
      ],
    }).compile();
    service = module.get(ReservationSharedService);
  });

  it('atomically increments the count and derives the penalty under one transaction', async () => {
    await service.incrementCancellationCount('client-1', {
      maxCancellationsBeforePenalty: 3,
      penaltyDurationDays: 7,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.clientCancellationCount.upsert).toHaveBeenCalledWith({
      where: { userId: 'client-1' },
      create: { userId: 'client-1', cancellationCount: 1 },
      update: { cancellationCount: { increment: 1 } },
    });
    const update = prisma.clientCancellationCount.update.mock.calls[0]![0];
    expect(update.where).toEqual({ userId: 'client-1' });
    expect(update.data.penaltyUntil).toBeInstanceOf(Date);
  });
});
