import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HolidayNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Šalje push/email za praznik svim korisnicima i postavlja pushSentAt. */
  async sendForHoliday(holidayId: string): Promise<{ sent: number }> {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id: holidayId },
    });
    if (!holiday) throw new NotFoundException('Praznik nije pronađen.');
    if (!holiday.sendPush)
      throw new BadRequestException(
        'Za ovaj praznik nije uključeno slanje obavijesti.',
      );
    if (holiday.pushSentAt)
      throw new BadRequestException(
        'Obavijest za ovaj praznik je već poslata.',
      );

    const userIds = await this.prisma.user
      .findMany({
        where: { isActive: true },
        select: { id: true },
      })
      .then((r) => r.map((u) => u.id));

    const title = holiday.name;
    const body = holiday.message ?? `Obavještavamo vas da ${holiday.name}.`;

    for (const userId of userIds) {
      await this.notifications.send({
        userId,
        title,
        body,
        type: 'holiday',
        data: { holidayId: holiday.id, date: holiday.date.toISOString() },
      });
    }

    await this.prisma.holiday.update({
      where: { id: holidayId },
      data: { pushSentAt: new Date() },
    });

    return { sent: userIds.length };
  }
}
