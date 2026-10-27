import { DailyLogCompletionOutboxService } from './daily-log-completion-outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogReceiptService } from './daily-log-receipt.service';
import { EventsGateway } from '../events/events.gateway';

const event = {
  id: 'outbox-1',
  eventType: 'daily_log.completed',
  attempts: 1,
  payload: { dailyLogEntryId: 'entry-1', completionVersion: 2 },
};

describe('DailyLogCompletionOutboxService', () => {
  const prisma = {
    outboxEvent: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    dailyLogEntry: { findUnique: jest.fn() },
  };
  const receipt = { sendPaymentReceiptIfApplicable: jest.fn() };
  const events = {
    emitToAdmins: jest.fn(),
    emitToStylists: jest.fn(),
    emitToUser: jest.fn(),
    emitToAll: jest.fn(),
  };
  let service: DailyLogCompletionOutboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 1 });
    prisma.outboxEvent.findUnique.mockResolvedValue(event);
    prisma.outboxEvent.findMany.mockResolvedValue([]);
    prisma.dailyLogEntry.findUnique.mockResolvedValue({
      id: 'entry-1',
      status: 'COMPLETED',
      completionVersion: 2,
      deletedAt: null,
      clientId: 'client-1',
      reservationId: null,
      reservation: null,
    });
    receipt.sendPaymentReceiptIfApplicable.mockResolvedValue(undefined);
    service = new DailyLogCompletionOutboxService(
      prisma as unknown as PrismaService,
      receipt as unknown as DailyLogReceiptService,
      events as unknown as EventsGateway,
    );
  });

  it('isporučuje receipt i realtime tek za aktuelnu generaciju', async () => {
    await service.dispatchAfterCommit('outbox-1');

    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'outbox-1',
          eventType: 'daily_log.completed',
          status: 'PENDING',
        }),
      }),
    );
    expect(receipt.sendPaymentReceiptIfApplicable).toHaveBeenCalledWith(
      'entry-1',
      'outbox-1',
      2,
    );
    expect(events.emitToAdmins).toHaveBeenCalledWith('daily-log:updated', {
      dailyLogEntryId: 'entry-1',
      status: 'COMPLETED',
    });
    expect(events.emitToStylists).toHaveBeenCalledWith('daily-log:updated', {
      dailyLogEntryId: 'entry-1',
      status: 'COMPLETED',
    });
    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1', status: 'PROCESSING' },
        data: expect.objectContaining({ status: 'DELIVERED' }),
      }),
    );
  });

  it('preskače zastarjelu isporuku nakon revert/re-completion', async () => {
    prisma.dailyLogEntry.findUnique.mockResolvedValueOnce({
      id: 'entry-1',
      status: 'COMPLETED',
      completionVersion: 3,
      deletedAt: null,
      clientId: 'client-1',
      reservationId: null,
      reservation: null,
    });

    await service.dispatchAfterCommit('outbox-1');

    expect(receipt.sendPaymentReceiptIfApplicable).not.toHaveBeenCalled();
    expect(events.emitToAdmins).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1', status: 'PROCESSING' },
        data: expect.objectContaining({ status: 'DELIVERED' }),
      }),
    );
  });

  it('ostavlja neuspjelu isporuku u retryable PENDING stanju bez raw error poruke', async () => {
    receipt.sendPaymentReceiptIfApplicable.mockRejectedValueOnce(
      new Error('sensitive transport detail'),
    );

    await expect(
      service.dispatchAfterCommit('outbox-1'),
    ).resolves.toBeUndefined();

    expect(prisma.outboxEvent.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'outbox-1', status: 'PROCESSING' },
        data: expect.objectContaining({
          status: 'PENDING',
          lastError: 'Delivery failed (Error).',
          lockedAt: null,
        }),
      }),
    );
  });

  it('cron skenira ograničen batch i vraća zastarjele lease-ove u red', async () => {
    prisma.outboxEvent.findMany.mockResolvedValueOnce([{ id: 'outbox-1' }]);

    await service.retryPending();

    expect(prisma.outboxEvent.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'daily_log.completed',
          status: 'PROCESSING',
          lockedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );
    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: 'daily_log.completed',
          status: 'PENDING',
        }),
        take: 25,
      }),
    );
    expect(receipt.sendPaymentReceiptIfApplicable).toHaveBeenCalledWith(
      'entry-1',
      'outbox-1',
      2,
    );
  });
});
