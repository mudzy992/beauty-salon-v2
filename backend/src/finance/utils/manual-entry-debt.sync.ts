import { BadRequestException } from '@nestjs/common'
import type { PrismaTx } from '../repositories/income-book.repository'

export type ManualEntryDebtSyncParams = {
  manualEntryId: string
  clientId: string | null
  stylistProfileId: string | null
  serviceId: string
  /** Ciljni iznos duga; 0 znači da dug ne smije postojati. */
  debtAmount: number
  note: string | null
  userId: string
}

/**
 * Usklađuje ClientDebt sa stanjem ručne KIF stavke.
 * Bez ovoga svaki update stavke kreira novi dug, a brisanje stavke
 * ostavlja dug zauvijek otvoren jer je veza `onDelete: SetNull`.
 */
export const syncDebtForManualEntry = async (
  tx: PrismaTx,
  params: ManualEntryDebtSyncParams,
): Promise<void> => {
  const existing = await tx.clientDebt.findFirst({
    where: { manualEntryId: params.manualEntryId, status: 'OPEN' },
  })

  if (params.debtAmount <= 0) {
    if (existing) await tx.clientDebt.delete({ where: { id: existing.id } })
    return
  }

  if (!params.clientId || !params.stylistProfileId) {
    throw new BadRequestException(
      'Za dug su obavezni i klijent i stilista.',
    )
  }

  if (existing) {
    await tx.clientDebt.update({
      where: { id: existing.id },
      data: {
        clientId: params.clientId,
        stylistProfileId: params.stylistProfileId,
        serviceId: params.serviceId,
        amount: params.debtAmount,
        ...(params.note != null && { note: params.note }),
      },
    })
    return
  }

  await tx.clientDebt.create({
    data: {
      clientId: params.clientId,
      stylistProfileId: params.stylistProfileId,
      serviceId: params.serviceId,
      manualEntryId: params.manualEntryId,
      amount: params.debtAmount,
      note: params.note ?? undefined,
      createdById: params.userId,
    },
  })
}

/** Naplaćeni dug se ne smije tiho izmijeniti/obrisati kroz izvornu stavku. */
export const assertNoSettledDebt = async (
  tx: PrismaTx,
  manualEntryId: string,
  action: string,
): Promise<void> => {
  const settled = await tx.clientDebt.findFirst({
    where: { manualEntryId, status: 'SETTLED' },
    select: { id: true },
  })
  if (settled) {
    throw new BadRequestException(
      `Dug vezan za ovu stavku je već naplaćen – ${action} nije moguće.`,
    )
  }
}
