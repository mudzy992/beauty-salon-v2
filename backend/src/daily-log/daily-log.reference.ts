import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

export const buildDailyLogReferenceCode = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `DK-${y}${m}${day}-${suffix}`;
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
