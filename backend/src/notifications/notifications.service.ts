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

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  fromEmail: string;
  fromName: string;
  replyTo: string | null;
  signature: string;
  rejectUnauthorized: boolean;
  requireTls: boolean;
  ignoreTls: boolean;
  connectionTimeoutMs: number;
  greetingTimeoutMs: number;
  socketTimeoutMs: number;
  pool: boolean;
  maxConnections: number;
  maxMessages: number;
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
    if (doEmail) {
      await this.sendEmail(
        options.userId,
        options.title,
        options.body,
        options.type,
        options.data,
      );
    }
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

  async sendTestEmail(params: { to: string; requestedByUsername: string }) {
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      throw new NotFoundException(
        'Email postavke nisu konfigurirane. Unesite SMTP podatke u admin panelu.',
      );
    }
    const transporter = this.createSmtpTransporter(mailConfig);
    const appUrl = await this.resolveAppBaseUrl();
    const html = this.buildDefaultEmailTemplate({
      title: 'Test email konfiguracije',
      intro: 'Ovo je test poruka. Konfiguracija slanja emaila je ispravna.',
      body: `Zahtjev za test je poslao korisnik: ${params.requestedByUsername}.`,
      ctaLabel: 'Otvori aplikaciju',
      ctaUrl: appUrl,
      signature: mailConfig.signature,
    });
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: params.to,
      subject: 'Test email konfiguracije',
      text: `Test email konfiguracije. Poslao: ${params.requestedByUsername}.`,
      html,
      ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
    });
    return { ok: true };
  }

  async sendTestEmailToUser(params: {
    userId: string;
    requestedByUsername: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true },
    });
    if (!user?.email) {
      throw new NotFoundException('Trenutni admin korisnik nema email adresu.');
    }
    return this.sendTestEmail({
      to: user.email,
      requestedByUsername: params.requestedByUsername,
    });
  }

  async testSmtpConnection() {
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      throw new NotFoundException(
        'Email postavke nisu konfigurirane. Unesite SMTP podatke u admin panelu.',
      );
    }
    const transporter = this.createSmtpTransporter(mailConfig);
    await transporter.verify();
    return { ok: true, message: 'SMTP konekcija je uspješna.' };
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
    type: NotificationType,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (!user?.email) return;
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      return;
    }
    const transporter = this.createSmtpTransporter(mailConfig);
    const userName = user.firstName || 'korisniče';
    const content = await this.buildNotificationEmailContent({
      type,
      title,
      body,
      data,
      userName,
      signature: mailConfig.signature,
    });
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: user.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
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
    const transporter = this.createSmtpTransporter(mailConfig);
    const greetingName = params.firstName?.trim() || 'korisniče';
    const subject = 'Verifikacija email adrese';
    const plainText = `Poštovani ${greetingName}, vaš verifikacijski kod je ${params.code}. Kod važi 24 sata.`;
    const appUrl = await this.resolveAppBaseUrl();
    const html = this.buildDefaultEmailTemplate({
      title: 'Verifikacija email adrese',
      intro: `Poštovani ${greetingName},`,
      body: `Vaš verifikacijski kod je ${params.code}. Kod važi 24 sata.`,
      ctaLabel: 'Otvori aplikaciju',
      ctaUrl: appUrl,
      codeBlock: params.code,
      signature: mailConfig.signature,
    });
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: params.to,
      subject,
      text: plainText,
      html,
      ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
    });
  }

  private createSmtpTransporter(mailConfig: MailConfig) {
    return nodemailer.createTransport({
      host: mailConfig.host,
      port: mailConfig.port,
      secure: mailConfig.secure,
      requireTLS: mailConfig.requireTls,
      ignoreTLS: mailConfig.ignoreTls,
      connectionTimeout: mailConfig.connectionTimeoutMs,
      greetingTimeout: mailConfig.greetingTimeoutMs,
      socketTimeout: mailConfig.socketTimeoutMs,
      pool: mailConfig.pool,
      maxConnections: mailConfig.maxConnections,
      maxMessages: mailConfig.maxMessages,
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
  }

  private async buildNotificationEmailContent(params: {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    userName: string;
    signature: string;
  }) {
    const appUrl = await this.resolveAppBaseUrl();
    const reservationId =
      params.data && typeof params.data.reservationId === 'string'
        ? params.data.reservationId
        : null;
    const adminReservationsUrl = `${appUrl}/admin/reservations`;
    const publicReservationsUrl = `${appUrl}/rezervacija`;
    const ctaByType: Record<NotificationType, { label: string; url: string }> = {
      reservation_new: { label: 'Otvori rezervacije', url: adminReservationsUrl },
      reservation_confirmed: { label: 'Pregled rezervacije', url: publicReservationsUrl },
      reservation_cancelled: { label: 'Pregled rezervacije', url: publicReservationsUrl },
      reservation_reminder: { label: 'Pregled rezervacije', url: publicReservationsUrl },
      reservation_reschedule: { label: 'Pregled rezervacije', url: publicReservationsUrl },
      holiday: { label: 'Otvori aplikaciju', url: appUrl },
      general: { label: 'Otvori aplikaciju', url: appUrl },
    };
    const plainTextByType: Record<NotificationType, string> = {
      reservation_new:
        'Imate novu rezervaciju. Provjerite listu rezervacija u admin panelu.',
      reservation_confirmed:
        'Vaša rezervacija je potvrđena. Pregledajte detalje termina u aplikaciji.',
      reservation_cancelled:
        'Rezervacija je otkazana. U aplikaciji možete pogledati razlog i detalje.',
      reservation_reminder:
        'Podsjetnik za rezervaciju. Molimo provjerite detalje termina.',
      reservation_reschedule:
        'Termin je pomjeren. Potvrdite novi termin unutar aplikacije.',
      holiday:
        'Obavijest o neradnom danu/prazniku. Provjerite kalendar i obavijesti.',
      general:
        'Imate novu opću notifikaciju iz sistema.',
    };
    const selectedCta = ctaByType[params.type];
    const reservationLine = reservationId ? `Referenca rezervacije: ${reservationId}.` : '';
    const text = `Poštovani ${params.userName}, ${plainTextByType[params.type]} ${params.body} ${reservationLine} Detalji: ${selectedCta.url}`;
    const html = this.buildDefaultEmailTemplate({
      title: params.title,
      intro: `Poštovani ${params.userName},`,
      body: `${params.body}${reservationLine ? ` ${reservationLine}` : ''}`,
      ctaLabel: selectedCta.label,
      ctaUrl: selectedCta.url,
      signature: params.signature,
    });
    return {
      subject: params.title,
      text,
      html,
    };
  }

  private buildDefaultEmailTemplate(params: {
    title: string;
    intro: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
    codeBlock?: string;
    signature?: string;
  }) {
    const ctaSection =
      params.ctaLabel && params.ctaUrl
        ? `<p style="margin:24px 0 0"><a href="${params.ctaUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">${params.ctaLabel}</a></p>`
        : '';
    const codeSection = params.codeBlock
      ? `<div style="display:inline-block;padding:12px 18px;border-radius:8px;background:#f3f4f6;font-size:24px;letter-spacing:4px;font-weight:700;margin:12px 0">${params.codeBlock}</div>`
      : '';
    return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px">
<h2 style="margin:0 0 12px">${params.title}</h2>
<p style="margin:0 0 12px">${params.intro}</p>
<p style="margin:0 0 12px">${params.body}</p>
${codeSection}
${ctaSection}
<p style="margin:24px 0 0;color:#6b7280;font-size:12px">${params.signature || 'Beauty Salon Nejra'}</p>
</div>`;
  }

  private async resolveAppBaseUrl(): Promise<string> {
    const fromSettings = await this.getSettingValue('system_public_app_url');
    const fromEnv =
      this.config.get<string>('APP_PUBLIC_URL') ||
      this.config.get<string>('FRONTEND_URL');
    return (fromSettings || fromEnv || 'http://localhost:3000').replace(/\/$/, '');
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

  private toNumber(
    value: string | null,
    fallback: number,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
  ): number {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }

  private async resolveMailConfig(): Promise<MailConfig | null> {
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
    const replyTo =
      (await this.getSettingValue('system_email_reply_to')) ||
      this.config.get<string>('SMTP_REPLY_TO') ||
      null;
    const signature =
      (await this.getSettingValue('system_email_signature')) ||
      this.config.get<string>('SMTP_SIGNATURE') ||
      'Beauty Salon Nejra';
    const rejectUnauthorizedRaw =
      (await this.getSettingValue('system_email_tls_reject_unauthorized')) ||
      this.config.get<string>('SMTP_TLS_REJECT_UNAUTHORIZED') ||
      'true';
    const requireTlsRaw =
      (await this.getSettingValue('system_email_require_tls')) ||
      this.config.get<string>('SMTP_REQUIRE_TLS') ||
      'false';
    const ignoreTlsRaw =
      (await this.getSettingValue('system_email_ignore_tls')) ||
      this.config.get<string>('SMTP_IGNORE_TLS') ||
      'false';
    const connectionTimeoutRaw =
      (await this.getSettingValue('system_email_connection_timeout_ms')) ||
      this.config.get<string>('SMTP_CONNECTION_TIMEOUT_MS') ||
      '10000';
    const greetingTimeoutRaw =
      (await this.getSettingValue('system_email_greeting_timeout_ms')) ||
      this.config.get<string>('SMTP_GREETING_TIMEOUT_MS') ||
      '10000';
    const socketTimeoutRaw =
      (await this.getSettingValue('system_email_socket_timeout_ms')) ||
      this.config.get<string>('SMTP_SOCKET_TIMEOUT_MS') ||
      '20000';
    const poolRaw =
      (await this.getSettingValue('system_email_pool')) ||
      this.config.get<string>('SMTP_POOL') ||
      'true';
    const maxConnectionsRaw =
      (await this.getSettingValue('system_email_max_connections')) ||
      this.config.get<string>('SMTP_MAX_CONNECTIONS') ||
      '5';
    const maxMessagesRaw =
      (await this.getSettingValue('system_email_max_messages')) ||
      this.config.get<string>('SMTP_MAX_MESSAGES') ||
      '100';
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
      replyTo,
      signature,
      rejectUnauthorized: this.toBoolean(rejectUnauthorizedRaw, true),
      requireTls: this.toBoolean(requireTlsRaw, false),
      ignoreTls: this.toBoolean(ignoreTlsRaw, false),
      connectionTimeoutMs: this.toNumber(connectionTimeoutRaw, 10000, 1000, 120000),
      greetingTimeoutMs: this.toNumber(greetingTimeoutRaw, 10000, 1000, 120000),
      socketTimeoutMs: this.toNumber(socketTimeoutRaw, 20000, 1000, 300000),
      pool: this.toBoolean(poolRaw, true),
      maxConnections: this.toNumber(maxConnectionsRaw, 5, 1, 50),
      maxMessages: this.toNumber(maxMessagesRaw, 100, 1, 5000),
    };
  }
}
