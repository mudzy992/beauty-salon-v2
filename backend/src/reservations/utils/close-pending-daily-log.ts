import type { Prisma } from '@prisma/client';

const CALENDAR_REORDER_REASON = 'Pomjereno sa kalendara';

type PendingDailyLogWriter = Pick<Prisma.TransactionClient, 'dailyLogEntry'>;

export const closePendingDailyLogForReorder = async (
  prisma: PendingDailyLogWriter,
  reservationId: string,
): Promise<number> => {
  const result = await prisma.dailyLogEntry.updateMany({
    where: {
      reservationId,
      deletedAt: null,
      status: 'PENDING',
    },
    data: {
      deletedAt: new Date(),
      deleteReason: CALENDAR_REORDER_REASON,
    },
  });
  return result.count;
};
