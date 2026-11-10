import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnlyString } from '../common/utils/date-only';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class DailyLogValidators {
  constructor(private readonly prisma: PrismaService) {}

  normalizeServiceIds(serviceIds?: string[], serviceId?: string): string[] {
    const raw =
      serviceIds && serviceIds.length > 0
        ? serviceIds
        : serviceId
          ? [serviceId]
          : [];
    const ids = [...new Set(raw.map((x) => x.trim()).filter(Boolean))];
    if (ids.length === 0) {
      throw new BadRequestException(apiError('RESERVE_SERVICE_REQUIRED'));
    }
    return ids;
  }

  async assertClientServiceGenderMatch(
    clientId: string | null | undefined,
    serviceIds: string[],
  ): Promise<void> {
    if (!clientId) return;
    const [client, services] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: clientId },
        select: { id: true, gender: true },
      }),
      this.prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, gender: true },
      }),
    ]);
    if (!client) throw new NotFoundException(apiError('USERS_NOT_FOUND'));
    if (!client.gender) throw new BadRequestException('GENDER_REQUIRED');
    if (services.length !== serviceIds.length) {
      throw new NotFoundException(apiError('RESERVE_SERVICE_UNAVAILABLE'));
    }
    if (services.some((s) => s.gender !== client.gender)) {
      throw new BadRequestException(apiError('RESERVE_SERVICE_GENDER_MISMATCH'));
    }
  }

  parseDate(value: string): Date {
    try {
      return parseDateOnlyString(value);
    } catch {
      throw new BadRequestException('Datum nije validan.');
    }
  }
}
