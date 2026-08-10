import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { CampaignAudienceDto } from './dto/campaign-audience.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { SettingsService } from '../settings/settings.service';
import { NotificationsRepository } from './notifications.repository';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'BOTH';
export type NotificationType =
  | 'reservation_new'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  | 'reservation_reschedule'
  | 'holiday'
  | 'client_debt'
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

interface EmailTemplateConfig {
  subject?: string;
  title?: string;
  intro?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  plainText?: string;
}

interface CampaignTemplateDefinition {
  id: string;
  name: string;
  html: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly repo: NotificationsRepository,
    private readonly config: ConfigService,
    private readonly events: EventsGateway,
    private readonly settings: SettingsService,
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

    const notification = await this.repo.createNotification({
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
    return this.repo.findNotificationsForUser({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(id: string, userId: string) {
    const n = await this.repo.findFirstNotification({
      where: { id, userId },
    });
    if (!n) throw new NotFoundException('Notifikacija nije pronađena.');
    return this.repo.updateNotification({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getPreferences(userId: string) {
    return this.repo.findPreferences({
      where: { userId },
    });
  }

  async setPreference(
    userId: string,
    type: string,
    pushEnabled: boolean,
    emailEnabled: boolean,
  ) {
    return this.repo.upsertPreference({
      where: { userId_type: { userId, type } },
      create: { userId, type, pushEnabled, emailEnabled },
      update: { pushEnabled, emailEnabled },
    });
  }

  async registerPushToken(userId: string, token: string, platform: string) {
    await this.repo.upsertPushToken({
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
    const user = await this.repo.findUser({
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

  async getCampaignAudienceSummary(audience: CampaignAudienceDto) {
    const users = await this.resolveCampaignAudienceUsers(audience);
    return {
      total: users.length,
      sample: users.slice(0, 10).map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })),
    };
  }

  async sendCampaign(dto: SendCampaignDto, requestedByUserId: string) {
    const campaignTemplates = await this.getCampaignTemplates();
    const selectedTemplate = campaignTemplates.find(
      (template) => template.id === dto.templateId,
    );
    if (!selectedTemplate) {
      throw new NotFoundException('Kampanjski template nije pronađen.');
    }
    const recipients = await this.resolveCampaignAudienceUsers(dto.audience);
    if (recipients.length === 0) {
      return {
        ok: true,
        delivered: 0,
        skipped: 0,
        message: 'Nema korisnika koji odgovaraju odabranoj publici.',
      };
    }
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      throw new NotFoundException(
        'Email postavke nisu konfigurirane. Unesite SMTP podatke u admin panelu.',
      );
    }
    const transporter = this.createSmtpTransporter(mailConfig);
    const appUrl = await this.resolveAppBaseUrl();
    const subject =
      dto.subjectOverride?.trim() ||
      dto.campaignName?.trim() ||
      selectedTemplate.name ||
      'Nova kampanja';
    let delivered = 0;
    let skipped = 0;
    for (const user of recipients) {
      if (!user.email) {
        skipped += 1;
        continue;
      }
      const personalizedHtml = this.applyCampaignVariables(selectedTemplate.html, {
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username,
        email: user.email,
        appUrl,
      });
      await transporter.sendMail({
        from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
        to: user.email,
        subject,
        text: this.convertHtmlToText(personalizedHtml),
        html: personalizedHtml,
        ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
      });
      delivered += 1;
      if (dto.createInAppNotification ?? true) {
        await this.repo.createNotification({
          data: {
            userId: user.id,
            title: subject,
            body: dto.campaignName?.trim() || 'Nova email kampanja.',
            type: 'general',
            data: {
              campaignTemplateId: dto.templateId,
              tags: dto.tags || [],
              source: 'email_campaign',
              requestedByUserId,
            },
            channel: 'EMAIL',
            isRead: false,
          },
        });
      }
    }
    return {
      ok: true,
      delivered,
      skipped,
      totalTargeted: recipients.length,
    };
  }

  private async getEffectivePreferences(
    userId: string,
    type: NotificationType,
  ): Promise<{ pushEnabled: boolean; emailEnabled: boolean }> {
    const prefs = await this.repo.findPreference({
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
    const rows = await this.repo.findPushTokens({
      where: { userId },
      select: { token: true },
    });
    const { default: Expo } = await import('expo-server-sdk');
    const tokens = rows.map((r) => r.token).filter((t) => Expo.isExpoPushToken(t));
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
        this.logger.warn('Expo push send error', err as Error);
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
    const user = await this.repo.findUser({
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
    const template = await this.getEmailTemplateConfig('verification');
    const plainText =
      template.plainText ||
      `Poštovani ${greetingName}, vaš verifikacijski kod je ${params.code}. Kod važi 24 sata.`;
    const appUrl = await this.resolveAppBaseUrl();
    const html = this.buildDefaultEmailTemplate({
      title: template.title || 'Verifikacija email adrese',
      intro: template.intro || `Poštovani ${greetingName},`,
      body:
        template.body ||
        `Vaš verifikacijski kod je ${params.code}. Kod važi 24 sata.`,
      ctaLabel: template.ctaLabel || 'Otvori aplikaciju',
      ctaUrl: appUrl,
      codeBlock: params.code,
      signature: mailConfig.signature,
    });
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: params.to,
      subject: template.subject || subject,
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

  private applyNotificationEmailPlaceholders(
    input: string,
    vars: Record<string, string>,
  ): string {
    let out = input;
    for (const [key, value] of Object.entries(vars)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      out = out.replace(pattern, value);
    }
    return out;
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
    const publicReferenceCode =
      params.data && typeof params.data.publicReferenceCode === 'string'
        ? params.data.publicReferenceCode.trim()
        : '';
    const clientViewToken =
      params.data && typeof params.data.clientViewToken === 'string'
        ? params.data.clientViewToken.trim()
        : '';
    const adminReservationsUrl = `${appUrl}/admin/reservations`;
    const publicReservationsUrl = `${appUrl}/rezervacija`;
    const reservationViewUrl =
      clientViewToken.length > 0
        ? `${appUrl}/moj-termin/${encodeURIComponent(clientViewToken)}`
        : publicReservationsUrl;
    const reservationReference = publicReferenceCode;
    const placeholderVars: Record<string, string> = {
      appUrl,
      reservationReference,
      reservationViewUrl,
      reservationId: reservationId ?? '',
      firstName: params.userName,
    };
    const ph = (s: string) =>
      this.applyNotificationEmailPlaceholders(s, placeholderVars);
    const ctaByType: Record<NotificationType, { label: string; url: string }> = {
      reservation_new: { label: 'Otvori rezervacije', url: adminReservationsUrl },
      reservation_confirmed: {
        label: 'Pregled rezervacije',
        url: reservationViewUrl,
      },
      reservation_cancelled: {
        label: 'Pregled rezervacije',
        url: reservationViewUrl,
      },
      reservation_reminder: {
        label: 'Pregled rezervacije',
        url: reservationViewUrl,
      },
      reservation_reschedule: {
        label: 'Pregled rezervacije',
        url: reservationViewUrl,
      },
      holiday: { label: 'Otvori aplikaciju', url: appUrl },
      client_debt: { label: 'Moj profil', url: appUrl },
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
      client_debt:
        'Kreirano je novo dugovanje na vašem računu. Pregledajte iznos u profilu.',
      general:
        'Imate novu opću notifikaciju iz sistema.',
    };
    const template = await this.getEmailTemplateConfig(params.type);
    const reservationLine = reservationReference
      ? `Broj termina: ${reservationReference}.`
      : '';
    const defaultBody = `${params.body}${
      reservationLine ? ` ${reservationLine}` : ''
    }`;
    const defaultCtaUrl = ctaByType[params.type].url;
    const selectedCta = {
      label: ph(template.ctaLabel || ctaByType[params.type].label),
      url: ph(template.ctaUrl || defaultCtaUrl),
    };
    const text = template.plainText
      ? ph(template.plainText)
      : `Poštovani ${params.userName}, ${plainTextByType[params.type]} ${
          params.body
        } ${reservationLine ? `${reservationLine} ` : ''}Detalji: ${
          selectedCta.url
        }`;
    const html = this.buildDefaultEmailTemplate({
      title: ph(template.title || params.title),
      intro: ph(template.intro || `Poštovani ${params.userName},`),
      body: template.body ? ph(template.body) : defaultBody,
      ctaLabel: selectedCta.label,
      ctaUrl: selectedCta.url,
      signature: params.signature,
    });
    return {
      subject: ph(template.subject || params.title),
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
    return `<div style="margin:0;padding:24px;background:#f9f3f0;font-family:Arial,sans-serif;color:#2d1f1c">
<div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #f2e7e2;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(45,31,28,0.08)">
<div style="padding:28px 32px;background:linear-gradient(135deg,#2d1f1c 0%,#7b4b3a 55%,#d4b098 100%);color:#fff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.92">Beauty Salon Premium</div>
<h2 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700">${params.title}</h2>
</div>
<div style="padding:30px 32px">
<p style="margin:0 0 12px;font-size:16px">${params.intro}</p>
<p style="margin:0 0 12px;font-size:15px;color:#4b3a35">${params.body}</p>
${codeSection}
${ctaSection}
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #f2e7e2;color:#7e675f;font-size:12px">
${params.signature || 'Beauty Salon Nejra'}
</div>
</div>
</div>
</div>`;
  }

  private async getEmailTemplateConfig(
    key: NotificationType | 'verification',
  ): Promise<EmailTemplateConfig> {
    const raw = await this.settings.getValue(`system_email_template_${key}`);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as EmailTemplateConfig;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private convertHtmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private applyCampaignVariables(
    html: string,
    data: {
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      appUrl: string;
    },
  ): string {
    return html
      .replace(/\{\{\s*firstName\s*\}\}/g, data.firstName)
      .replace(/\{\{\s*lastName\s*\}\}/g, data.lastName)
      .replace(/\{\{\s*username\s*\}\}/g, data.username)
      .replace(/\{\{\s*email\s*\}\}/g, data.email)
      .replace(/\{\{\s*appUrl\s*\}\}/g, data.appUrl);
  }

  private async getCampaignTemplates(): Promise<CampaignTemplateDefinition[]> {
    const raw = await this.settings.getValue('system_email_campaign_templates');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as CampaignTemplateDefinition[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          typeof item.html === 'string',
      );
    } catch {
      return [];
    }
  }

  private async resolveCampaignAudienceUsers(audience: CampaignAudienceDto) {
    const users = await this.repo.findUsers({
      where: {
        ...(audience.onlyActive ?? true ? { isActive: true } : {}),
        ...(audience.onlyEmailVerified ?? false ? { isEmailVerified: true } : {}),
        ...(audience.includeUserIds?.length
          ? { id: { in: audience.includeUserIds } }
          : {}),
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    const roleFiltered = audience.roles?.length
      ? users.filter((user) =>
          user.userRoles.some((userRole) => audience.roles?.includes(userRole.role.name as 'SYSTEM_ADMIN' | 'OWNER' | 'STYLIST' | 'CLIENT')),
        )
      : users;
    const excluded = audience.excludeUserIds?.length
      ? roleFiltered.filter((user) => !audience.excludeUserIds?.includes(user.id))
      : roleFiltered;
    return excluded;
  }

  private async resolveAppBaseUrl(): Promise<string> {
    const fromSettings = await this.settings.getValue('system_public_app_url');
    const fromEnv =
      this.config.get<string>('APP_PUBLIC_URL') ||
      this.config.get<string>('FRONTEND_URL');
    return (fromSettings || fromEnv || 'http://localhost:3000').replace(/\/$/, '');
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
      (await this.settings.getValue('system_email_host')) ||
      this.config.get<string>('SMTP_HOST') ||
      null;
    const portRaw =
      (await this.settings.getValue('system_email_port')) ||
      this.config.get<string>('SMTP_PORT') ||
      '587';
    const secureRaw =
      (await this.settings.getValue('system_email_secure')) ||
      this.config.get<string>('SMTP_SECURE') ||
      'false';
    const username =
      (await this.settings.getValue('system_email_username')) ||
      this.config.get<string>('SMTP_USER') ||
      null;
    const password =
      (await this.settings.getValue('system_email_password')) ||
      this.config.get<string>('SMTP_PASS') ||
      null;
    const fromEmail =
      (await this.settings.getValue('system_notif_email_from')) ||
      this.config.get<string>('SMTP_FROM') ||
      '';
    const fromName =
      (await this.settings.getValue('system_notif_email_name')) ||
      this.config.get<string>('SMTP_FROM_NAME') ||
      'Beauty Salon';
    const replyTo =
      (await this.settings.getValue('system_email_reply_to')) ||
      this.config.get<string>('SMTP_REPLY_TO') ||
      null;
    const signature =
      (await this.settings.getValue('system_email_signature')) ||
      this.config.get<string>('SMTP_SIGNATURE') ||
      'Beauty Salon Nejra';
    const rejectUnauthorizedRaw =
      (await this.settings.getValue('system_email_tls_reject_unauthorized')) ||
      this.config.get<string>('SMTP_TLS_REJECT_UNAUTHORIZED') ||
      'true';
    const requireTlsRaw =
      (await this.settings.getValue('system_email_require_tls')) ||
      this.config.get<string>('SMTP_REQUIRE_TLS') ||
      'false';
    const ignoreTlsRaw =
      (await this.settings.getValue('system_email_ignore_tls')) ||
      this.config.get<string>('SMTP_IGNORE_TLS') ||
      'false';
    const connectionTimeoutRaw =
      (await this.settings.getValue('system_email_connection_timeout_ms')) ||
      this.config.get<string>('SMTP_CONNECTION_TIMEOUT_MS') ||
      '10000';
    const greetingTimeoutRaw =
      (await this.settings.getValue('system_email_greeting_timeout_ms')) ||
      this.config.get<string>('SMTP_GREETING_TIMEOUT_MS') ||
      '10000';
    const socketTimeoutRaw =
      (await this.settings.getValue('system_email_socket_timeout_ms')) ||
      this.config.get<string>('SMTP_SOCKET_TIMEOUT_MS') ||
      '20000';
    const poolRaw =
      (await this.settings.getValue('system_email_pool')) ||
      this.config.get<string>('SMTP_POOL') ||
      'true';
    const maxConnectionsRaw =
      (await this.settings.getValue('system_email_max_connections')) ||
      this.config.get<string>('SMTP_MAX_CONNECTIONS') ||
      '5';
    const maxMessagesRaw =
      (await this.settings.getValue('system_email_max_messages')) ||
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
