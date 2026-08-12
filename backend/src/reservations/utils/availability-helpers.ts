import { PrismaService } from '../../prisma/prisma.service';
import { toLocalDateOnlyString } from '../../common/utils/date-only';
import { timeToMinutes } from './time-slot.utils';

export async function getStylistIdsForServices(
  prisma: PrismaService,
  serviceIds: string[],
): Promise<string[]> {
  const uniqueIds = [...new Set(serviceIds.map((x) => x.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  const rows = await prisma.stylistService.findMany({
    where: { serviceId: { in: uniqueIds } },
    select: { stylistProfileId: true, serviceId: true },
  });
  const counts = new Map<string, number>();
  for (const r of rows) {
    counts.set(r.stylistProfileId, (counts.get(r.stylistProfileId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c === uniqueIds.length)
    .map(([stylistProfileId]) => stylistProfileId);
}

export async function getStylistProfilesForSlots(
  prisma: PrismaService,
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
      (wh) => wh.dateOverride && toLocalDateOnlyString(wh.dateOverride) === dateStr,
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
