import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'BOTH';
export type NotificationType =
  | 'reservation_new'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  | 'reservation_reschedule'
  | 'holiday'
  | 'general';

export interface SendNotificationOptions {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: EventsGateway,
  ) {}

  /**
   * Šalje notifikaciju korisniku: upis u bazu + opciono FCM push i/ili email prema preferencama.
   */
  async send(options: SendNotificationOptions): Promise<void> {
    const channel = options.channel ?? 'BOTH';
    const prefs = await this.getEffectivePreferences(
      options.userId,
      options.type,
    );
    const doPush =
      (channel === 'PUSH' || channel === 'BOTH') && prefs.pushEnabled;
    const doEmail =
      (channel === 'EMAIL' || channel === 'BOTH') && prefs.emailEnabled;

    const notification = await this.prisma.notification.create({
      data: {
        userId: options.userId,
        title: options.title,
        body: options.body,
        type: options.type,
        data: (options.data ?? undefined) as object | undefined,
        channel,
        isRead: false,
      },
    });

    this.events.emitToUser(
      options.userId,
      SOCKET_EVENTS.NOTIFICATION_NEW,
      notification,
    );

    if (doPush)
      await this.sendPush(
        options.userId,
        options.title,
        options.body,
        options.data,
      );
    if (doEmail)
      await this.sendEmail(options.userId, options.title, options.body);
  }

  /**
   * Šalje notifikaciju više korisnika (npr. svi stilisti za novu rezervaciju).
   */
  async sendToMany(
    userIds: string[],
    title: string,
    body: string,
    type: NotificationType,
    data?: Record<string, unknown>,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.send({ userId, title, body, type, data });
    }
  }

  async findForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(id: string, userId: string) {
    const n = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!n) throw new NotFoundException('Notifikacija nije pronađena.');
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { userId },
    });
  }

  async setPreference(
    userId: string,
    type: string,
    pushEnabled: boolean,
    emailEnabled: boolean,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, pushEnabled, emailEnabled },
      update: { pushEnabled, emailEnabled },
    });
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
    return { ok: true };
  }

  private async getEffectivePreferences(
    userId: string,
    type: NotificationType,
  ): Promise<{ pushEnabled: boolean; emailEnabled: boolean }> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    return {
      pushEnabled: prefs?.pushEnabled ?? true,
      emailEnabled: prefs?.emailEnabled ?? true,
    };
  }

  private async sendPush(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const rows = await this.prisma.pushToken.findMany({
      where: { userId },
      select: { token: true },
    });
    const tokens = rows
      .map((r) => r.token)
      .filter((t) => Expo.isExpoPushToken(t));
    if (tokens.length === 0) return;

    const expo = new Expo({
      accessToken: this.config.get<string>('EXPO_ACCESS_TOKEN'),
    });
    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: data ?? undefined,
      sound: 'default' as const,
    }));
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (err) {
        console.error('Expo push send error:', err);
      }
    }
  }

  private async sendEmail(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return;
    const transport = this.config.get<string>('SMTP_HOST');
    if (!transport) {
      // Nodemailer nije konfigurisan – samo log
      return;
    }
    // TODO: Nodemailer sendMail({ to: user.email, subject: title, text: body })
    // Za sada preskačemo stvarni email ako nije postavljen mailer modul.
  }
}
