import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RESERVATION_STATUS } from './constants';
import { timeToMinutes } from './utils/time-slot.utils';

@Injectable()
export class ReservationDelayCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Svake minute provjerava IN_PROGRESS rezervacije i,
   * kad probiju prag (pauseBetweenServices/2), obavijesti buduće klijente tog dana (jednom).
   */
  @Cron('*/1 * * * *')
  async tick() {
    const salon = await this.prisma.salonSettings.findFirst();
    if (!salon) return;
    const pause = salon.pauseBetweenServices ?? 0;
    const threshold = Math.floor(pause / 2);
    if (threshold <= 0) return;

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const running = await this.prisma.reservation.findMany({
      where: {
        status: RESERVATION_STATUS.IN_PROGRESS,
        reservationDate: { gte: today, lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) },
        delayNotifiedAt: null,
        confirmedStylistId: { not: null },
      },
      select: {
        id: true,
        clientId: true,
        serviceId: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        confirmedStylistId: true,
        useBreakAfterOverrun: true,
        service: { select: { name: true } },
      },
    });

    for (const r of running) {
      const endMin = timeToMinutes(r.endTime);
      const delay = nowMinutes - endMin;
      if (delay < threshold) continue;
      if (r.useBreakAfterOverrun === true) {
        // Stilist je označio da koristi pauzu — ne šaljemo automatska upozorenja.
        await this.prisma.reservation.update({
          where: { id: r.id },
          data: { delayNotifiedAt: new Date() },
        });
        continue;
      }

      // Nađi buduće rezervacije istog stiliste taj dan (poslije ove)
      const future = await this.prisma.reservation.findMany({
        where: {
          confirmedStylistId: r.confirmedStylistId!,
          reservationDate: { gte: today, lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) },
          startTime: { gt: r.startTime },
          status: { in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.ATTENDANCE_CONFIRMED] as any },
        },
        select: { id: true, clientId: true, startTime: true },
        orderBy: { startTime: 'asc' },
      });

      if (future.length > 0) {
        for (const f of future) {
          await this.notifications.send({
            userId: f.clientId,
            title: 'Moguće kašnjenje',
            body: 'Današnji termini mogu kasniti. Obavijestit ćemo vas o tačnom vremenu.',
            type: 'reservation_reminder',
            data: { kind: 'delay_warning', reservationId: f.id },
            channel: 'PUSH',
          });
        }
      }

      await this.prisma.reservation.update({
        where: { id: r.id },
        data: { delayNotifiedAt: new Date() },
      });
    }
  }
}

