import {
  applyClientCancel,
  applyNoShow,
  applyStylistCancel,
} from './daily-log-disposition-apply';

const makeDeps = () => {
  const prisma = {
    reservation: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'reservation-1',
        clientId: 'client-1',
        status: 'AWAITING_DAILY_LOG',
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    salonSettings: {
      findFirst: jest.fn().mockResolvedValue({
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 7,
      }),
    },
    clientCancellationCount: {},
  };
  const shared = {
    transitionTo: jest.fn((_from: string, to: string) => to),
    incrementCancellationCountInTransaction: jest
      .fn()
      .mockResolvedValue(undefined),
  };
  return { deps: { prisma, shared, dates: {} } as never, prisma, shared };
};

describe('Daily Log disposition transaction helpers', () => {
  it('updates a stylist cancellation through the supplied transaction client', async () => {
    const { deps, prisma, shared } = makeDeps();

    await applyStylistCancel(deps, 'reservation-1', 'Stylist nije dostupan');

    expect(prisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'reservation-1' },
        data: expect.objectContaining({
          status: 'CANCELLED_BY_STYLISTS',
          cancelReason: 'Stylist nije dostupan',
        }),
      }),
    );
    expect(
      shared.incrementCancellationCountInTransaction,
    ).not.toHaveBeenCalled();
  });

  it('keeps client cancellation and its penalty counter in the same transaction', async () => {
    const { deps, prisma, shared } = makeDeps();

    await applyClientCancel(deps, 'reservation-1', 'Klijent je otkazao');

    expect(prisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELLED_BY_CLIENT' }),
      }),
    );
    expect(shared.incrementCancellationCountInTransaction).toHaveBeenCalledWith(
      'client-1',
      {
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 7,
      },
      prisma,
    );
  });

  it('keeps the no-show penalty counter in the transaction when requested', async () => {
    const { deps, prisma, shared } = makeDeps();

    await applyNoShow(deps, 'reservation-1', 'Klijent se nije pojavio', true);

    expect(prisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'NO_SHOW' }),
      }),
    );
    expect(shared.incrementCancellationCountInTransaction).toHaveBeenCalledWith(
      'client-1',
      {
        maxCancellationsBeforePenalty: 3,
        penaltyDurationDays: 7,
      },
      prisma,
    );
  });
});
