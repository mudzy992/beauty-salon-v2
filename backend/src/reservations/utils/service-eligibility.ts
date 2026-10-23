import type { Prisma } from '@prisma/client';

export type StylistServiceReader = Pick<
  Prisma.TransactionClient,
  'stylistService'
>;

/** Services are bookable only while they and both catalog parents are active. */
export const buildBookableServiceWhere = (
  serviceIds: readonly string[],
): Prisma.ServiceWhereInput => ({
  id: { in: [...serviceIds] },
  isActive: true,
  subcategory: {
    is: {
      isActive: true,
      category: { is: { isActive: true } },
    },
  },
});

/** Return only stylists linked to every requested service and still active. */
export const getStylistIdsForServices = async (
  prisma: StylistServiceReader,
  serviceIds: string[],
): Promise<string[]> => {
  const uniqueIds = [
    ...new Set(serviceIds.map((x) => x.trim()).filter(Boolean)),
  ];
  if (uniqueIds.length === 0) return [];

  const rows = await prisma.stylistService.findMany({
    where: {
      serviceId: { in: uniqueIds },
      stylistProfile: { is: { isActive: true } },
    },
    select: { stylistProfileId: true, serviceId: true },
  });
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(
      row.stylistProfileId,
      (counts.get(row.stylistProfileId) ?? 0) + 1,
    );
  }

  return [...counts.entries()]
    .filter(([, count]) => count === uniqueIds.length)
    .map(([stylistProfileId]) => stylistProfileId);
};
