import { ClientDebtStatus, Prisma } from '@prisma/client';

/**
 * Atomically claims an OPEN debt for settlement.
 * The status predicate is evaluated by PostgreSQL in the write statement, so
 * concurrent repayments/write-offs cannot both transition the same debt.
 */
export const claimOpenClientDebt = async (
  tx: Prisma.TransactionClient,
  params: {
    debtId: string;
    settledById: string;
    settledAt?: Date;
    clientId?: string;
    stylistProfileId?: string;
    note?: string;
  },
): Promise<boolean> => {
  const result = await tx.clientDebt.updateMany({
    where: {
      id: params.debtId,
      status: ClientDebtStatus.OPEN,
      ...(params.clientId !== undefined ? { clientId: params.clientId } : {}),
      ...(params.stylistProfileId !== undefined
        ? { stylistProfileId: params.stylistProfileId }
        : {}),
    },
    data: {
      status: ClientDebtStatus.SETTLED,
      settledAt: params.settledAt ?? new Date(),
      settledById: params.settledById,
      ...(params.note !== undefined ? { note: params.note } : {}),
    },
  });

  return result.count === 1;
};
