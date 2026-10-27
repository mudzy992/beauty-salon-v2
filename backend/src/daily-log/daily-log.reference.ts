import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { toDateOnlyString } from '../common/utils/date-only';

export const buildDailyLogReferenceCode = (date: Date): string => {
  const day = toDateOnlyString(date).replaceAll('-', '');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `DK-${day}-${suffix}`;
};

export const allocateDailyLogReferenceCode = async (
  prisma: Pick<PrismaService, 'dailyLogEntry'>,
  date: Date,
): Promise<string> => {
  for (let i = 0; i < 8; i += 1) {
    const code = buildDailyLogReferenceCode(date);
    const clash = await prisma.dailyLogEntry.findFirst({
      where: { publicReferenceCode: code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  throw new BadRequestException(
    'Ne možemo generisati jedinstveni broj zapisa. Pokušajte ponovo.',
  );
};
