import { toDateOnlyString } from '../../common/utils/date-only';
import type { Prisma } from '@prisma/client';
import { getStylistIdsForServices } from './service-eligibility';
import { timeToMinutes } from './time-slot.utils';

export { getStylistIdsForServices } from './service-eligibility';

export async function getStylistProfilesForSlots(
  prisma: Pick<Prisma.TransactionClient, 'stylistService' | 'stylistProfile'>,
  serviceIds: string[],
  dayOfWeek: number,
  dateStr: string,
): Promise<Array<{ id: string; window: { start: number; end: number } }>> {
  const eligibleIds = await getStylistIdsForServices(prisma, serviceIds);
  if (eligibleIds.length === 0) return [];
  const allStylists = await prisma.stylistProfile.findMany({
    where: { isActive: true, id: { in: eligibleIds } },
    include: {
      workingHours: { where: { isWorkingDay: true } },
    },
  });

  const result: Array<{ id: string; window: { start: number; end: number } }> = [];
  for (const s of allStylists) {
    const override = s.workingHours.find(
      (wh) => wh.dateOverride && toDateOnlyString(wh.dateOverride) === dateStr,
    );
    const regular = s.workingHours.find(
      (wh) => !wh.dateOverride && wh.dayOfWeek === dayOfWeek,
    );
    const match = override ?? regular;
    if (match) {
      result.push({
        id: s.id,
        window: {
          start: timeToMinutes(match.startTime),
          end: timeToMinutes(match.endTime),
        },
      });
    }
  }
  return result;
}
