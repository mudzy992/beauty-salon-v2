import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Expo from 'expo-server-sdk';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
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
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      return;
    }
    const transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.username
        ? {
            user: mailConfig.username,
            pass: mailConfig.password,
          }
        : undefined,
      tls: {
        rejectUnauthorized: mailConfig.rejectUnauthorized,
      },
    } as SMTPTransport.Options);
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: user.email,
      subject: title,
      text: body,
      html: this.buildBasicEmailHtml({
        title,
        body,
      }),
    });
  }

  async sendVerificationCodeEmail(params: {
    to: string;
    code: string;
    firstName?: string | null;
  }) {
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      return;
    }
    const transporter = nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      auth: mailConfig.username
        ? {
            user: mailConfig.username,
            pass: mailConfig.password,
          }
        : undefined,
      tls: {
        rejectUnauthorized: mailConfig.rejectUnauthorized,
      },
    } as SMTPTransport.Options);
    const greetingName = params.firstName?.trim() || 'korisniče';
    const subject = 'Verifikacija email adrese';
    const plainText = `Poštovani ${greetingName}, vaš verifikacijski kod je ${params.code}. Kod važi 24 sata.`;
    const html = this.buildVerificationEmailHtml({
      name: greetingName,
      code: params.code,
      expiresInHours: 24,
    });
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: params.to,
      subject,
      text: plainText,
      html,
    });
  }

  private buildBasicEmailHtml(params: { title: string; body: string }) {
    return `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
<h2 style="margin:0 0 12px">${params.title}</h2>
<p style="margin:0">${params.body}</p>
</div>`;
  }

  private buildVerificationEmailHtml(params: {
    name: string;
    code: string;
    expiresInHours: number;
  }) {
    return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:560px">
<h2 style="margin:0 0 12px">Verifikacija email adrese</h2>
<p style="margin:0 0 12px">Poštovani ${params.name},</p>
<p style="margin:0 0 16px">Vaš verifikacijski kod je:</p>
<div style="display:inline-block;padding:12px 18px;border-radius:8px;background:#f3f4f6;font-size:24px;letter-spacing:4px;font-weight:700">${params.code}</div>
<p style="margin:16px 0 0">Kod važi ${params.expiresInHours} sata.</p>
</div>`;
  }

  private async getSettingValue(key: string): Promise<string | null> {
    const setting = await this.prisma.appSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value ?? null;
  }

  private toBoolean(value: string | null, fallback: boolean): boolean {
    if (value == null) return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
  }

  private async resolveMailConfig(): Promise<{
    host: string;
    port: number;
    secure: boolean;
    username: string | null;
    password: string | null;
    fromEmail: string;
    fromName: string;
    rejectUnauthorized: boolean;
  } | null> {
    const host =
      (await this.getSettingValue('system_email_host')) ||
      this.config.get<string>('SMTP_HOST') ||
      null;
    const portRaw =
      (await this.getSettingValue('system_email_port')) ||
      this.config.get<string>('SMTP_PORT') ||
      '587';
    const secureRaw =
      (await this.getSettingValue('system_email_secure')) ||
      this.config.get<string>('SMTP_SECURE') ||
      'false';
    const username =
      (await this.getSettingValue('system_email_username')) ||
      this.config.get<string>('SMTP_USER') ||
      null;
    const password =
      (await this.getSettingValue('system_email_password')) ||
      this.config.get<string>('SMTP_PASS') ||
      null;
    const fromEmail =
      (await this.getSettingValue('system_notif_email_from')) ||
      this.config.get<string>('SMTP_FROM') ||
      '';
    const fromName =
      (await this.getSettingValue('system_notif_email_name')) ||
      this.config.get<string>('SMTP_FROM_NAME') ||
      'Beauty Salon';
    const rejectUnauthorizedRaw =
      (await this.getSettingValue('system_email_tls_reject_unauthorized')) ||
      this.config.get<string>('SMTP_TLS_REJECT_UNAUTHORIZED') ||
      'true';
    if (!host || !fromEmail) {
      return null;
    }
    return {
      host,
      port: Number.parseInt(portRaw, 10) || 587,
      secure: this.toBoolean(secureRaw, false),
      username,
      password,
      fromEmail,
      fromName,
      rejectUnauthorized: this.toBoolean(rejectUnauthorizedRaw, true),
    };
  }
}
