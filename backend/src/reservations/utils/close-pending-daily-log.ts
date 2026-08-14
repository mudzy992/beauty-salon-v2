const CALENDAR_REORDER_REASON = 'Pomjereno sa kalendara';

export const closePendingDailyLogForReorder = async (
  prisma: {
    dailyLogEntry: {
      updateMany: (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Promise<{ count: number }>;
    };
  },
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
