import { BadRequestException } from '@nestjs/common';
import { DailyLogService } from './daily-log.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const user = { sub: 'stylist-1', roles: ['STYLIST'] } as CurrentUserPayload;

const makeService = () => {
  const prisma = {
    dailyLogEntry: {
      findMany: jest.fn(),
    },
  };
  const service = new DailyLogService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma };
};

describe('DailyLogService.findAll bounds', () => {
  it('requires both date bounds rather than querying all retained history', async () => {
    const { service, prisma } = makeService();

    await expect(service.findAll({}, user)).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.findAll({ fromDate: '2026-11-01' }, user),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.dailyLogEntry.findMany).not.toHaveBeenCalled();
  });

  it('accepts the maximum inclusive date window and applies a bounded take', async () => {
    const { service, prisma } = makeService();
    const expected = [{ id: 'entry-1' }];
    prisma.dailyLogEntry.findMany.mockResolvedValue(expected);

    await expect(
      service.findAll({ fromDate: '2026-01-01', toDate: '2026-03-03' }, user),
    ).resolves.toBe(expected);

    expect(prisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          date: {
            gte: new Date('2026-01-01T00:00:00.000Z'),
            lt: new Date('2026-03-04T00:00:00.000Z'),
          },
        }),
        take: 501,
      }),
    );
  });

  it('rejects a date window beyond 62 days', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.findAll({ fromDate: '2026-01-01', toDate: '2026-03-04' }, user),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.dailyLogEntry.findMany).not.toHaveBeenCalled();
  });

  it('rejects rather than silently truncating a window with over 500 entries', async () => {
    const { service, prisma } = makeService();
    prisma.dailyLogEntry.findMany.mockResolvedValue(
      Array.from({ length: 501 }, (_, index) => ({ id: `entry-${index}` })),
    );

    await expect(
      service.findAll({ fromDate: '2026-11-01', toDate: '2026-11-30' }, user),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 501 }),
    );
  });
});
