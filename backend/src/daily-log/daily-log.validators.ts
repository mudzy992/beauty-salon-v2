import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
      throw new BadRequestException('SERVICE_REQUIRED');
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
    if (!client) throw new NotFoundException('Korisnik nije pronađen.');
    if (!client.gender) throw new BadRequestException('GENDER_REQUIRED');
    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Servis nije pronađen.');
    }
    if (services.some((s) => s.gender !== client.gender)) {
      throw new BadRequestException('SERVICE_GENDER_MISMATCH');
    }
  }

  parseDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Datum nije validan.');
    }
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
