import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CampaignJob, CampaignRecipient, Prisma } from '@prisma/client';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { CampaignAudienceDto } from './dto/campaign-audience.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';
import { SettingsService } from '../settings/settings.service';
import { NotificationsRepository } from './notifications.repository';
import {
  buildDefaultEmailTemplateHtml,
  buildPaymentReceiptBodyText,
  escapeEmailHtml,
  normalizeEmailContentBlocks,
  type EmailContentBlock,
} from './utils/email-template';
import {
  createCampaignUnsubscribeToken,
  verifyCampaignUnsubscribeToken,
} from './utils/campaign-unsubscribe-token';

export type NotificationChannel = 'PUSH' | 'EMAIL' | 'BOTH';
export type NotificationType =
  | 'reservation_new'
  | 'reservation_confirmed'
  | 'reservation_cancelled'
  | 'reservation_reminder'
  | 'reservation_reschedule'
  | 'holiday'
  | 'client_debt'
  | 'payment_receipt'
  | 'general';

export interface SendNotificationOptions {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  channel?: NotificationChannel;
  sourceEventId?: string;
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
  blocks?: EmailContentBlock[];
}

interface CampaignTemplateDefinition {
  id: string;
  name: string;
  html: string;
}

const MAX_CAMPAIGN_RECIPIENTS = 100;

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
    let pushMaster = true;
    try {
      pushMaster = await this.settings.getBoolean('system_push_enabled');
    } catch {
      pushMaster = true;
    }
    const doPush =
      (channel === 'PUSH' || channel === 'BOTH') &&
      prefs.pushEnabled &&
      pushMaster;
    const doEmail =
      (channel === 'EMAIL' || channel === 'BOTH') && prefs.emailEnabled;

    const notificationData = {
      userId: options.userId,
      title: options.title,
      body: options.body,
      type: options.type,
      data: (options.data ?? undefined) as object | undefined,
      channel,
      sourceEventId: options.sourceEventId,
      isRead: false,
    };
    const notification = options.sourceEventId
      ? await this.repo.createNotificationForEvent({
          eventId: options.sourceEventId,
          userId: options.userId,
          data: notificationData,
        })
      : await this.repo.createNotification({ data: notificationData });

    this.events.emitToUser(
      options.userId,
      SOCKET_EVENTS.NOTIFICATION_NEW,
      notification,
    );

    if (doPush) {
      const existingKind =
        typeof options.data?.kind === 'string' && options.data.kind.trim()
          ? options.data.kind.trim()
          : null;
      const pushData: Record<string, unknown> = {
        ...(options.data ?? {}),
        type: options.type,
        kind: existingKind ?? options.type,
      };
      await this.sendPush(
        options.userId,
        options.title,
        options.body,
        pushData,
      );
    }

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
    sourceEventId?: string,
  ): Promise<void> {
    for (const userId of userIds) {
      await this.send({ userId, title, body, type, data, sourceEventId });
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

  async unregisterPushToken(userId: string, token: string) {
    try {
      await this.repo.deletePushToken({
        where: { token, userId },
      });
    } catch {
      // Token may already be removed or belong to another session.
    }
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

  async getCampaignEmailConsent(userId: string) {
    const consent = await this.repo.findCampaignEmailConsent(userId);
    return {
      optedIn: consent?.optedIn ?? false,
      consentedAt: consent?.consentedAt ?? null,
      withdrawnAt: consent?.withdrawnAt ?? null,
    };
  }

  async setCampaignEmailConsent(userId: string, optedIn: boolean) {
    const consent = await this.repo.setCampaignEmailConsent(userId, optedIn);
    return {
      optedIn: consent.optedIn,
      consentedAt: consent.consentedAt,
      withdrawnAt: consent.withdrawnAt,
    };
  }

  async unsubscribeCampaignEmail(token: string) {
    const payload = verifyCampaignUnsubscribeToken(
      token,
      this.config.getOrThrow<string>('JWT_SECRET'),
    );
    if (!payload) {
      throw new BadRequestException(
        'Campaign unsubscribe link is invalid or expired.',
      );
    }
    const unsubscribed = await this.repo.unsubscribeCampaignEmailConsent(
      payload.consentId,
      payload.consentedAt,
    );
    if (!unsubscribed) {
      throw new BadRequestException(
        'Campaign unsubscribe link is invalid or expired.',
      );
    }
    return { ok: true, unsubscribed: true };
  }

  async getCampaignAudienceSummary(audience: CampaignAudienceDto) {
    const users = await this.resolveCampaignAudienceUsers(audience);
    return {
      total: users.length,
      maxRecipients: MAX_CAMPAIGN_RECIPIENTS,
      exceedsLimit: users.length > MAX_CAMPAIGN_RECIPIENTS,
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
    const idempotencyKey = dto.idempotencyKey || randomUUID();
    const existing = await this.repo.findCampaignJobByRequest(
      requestedByUserId,
      idempotencyKey,
    );
    if (existing) return this.campaignEnqueueResult(existing, true);

    const campaignTemplates = await this.getCampaignTemplates();
    const selectedTemplate = campaignTemplates.find(
      (template) => template.id === dto.templateId,
    );
    if (!selectedTemplate) {
      throw new NotFoundException('Kampanjski template nije pronađen.');
    }
    const recipients = await this.resolveCampaignAudienceUsers(dto.audience);
    if (recipients.length > MAX_CAMPAIGN_RECIPIENTS) {
      throw new BadRequestException(
        `Kampanja ne može imati više od ${MAX_CAMPAIGN_RECIPIENTS} primalaca.`,
      );
    }
    if (recipients.length === 0) {
      return {
        ok: true,
        queued: false,
        delivered: 0,
        skipped: 0,
        totalTargeted: 0,
        message: 'Nema korisnika koji odgovaraju odabranoj publici.',
      };
    }
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      throw new NotFoundException(
        'Email postavke nisu konfigurirane. Unesite SMTP podatke u admin panelu.',
      );
    }
    const appUrl = await this.resolveAppBaseUrl();
    const subject =
      dto.subjectOverride?.trim() ||
      dto.campaignName?.trim() ||
      selectedTemplate.name ||
      'Nova kampanja';
    const campaignName =
      dto.campaignName?.trim() || selectedTemplate.name || 'Nova kampanja';
    const jobData: Prisma.CampaignJobUncheckedCreateInput = {
      templateId: dto.templateId,
      templateName: selectedTemplate.name,
      subject,
      templateHtml: selectedTemplate.html,
      appUrl,
      campaignName,
      tags: (dto.tags || []) as Prisma.InputJsonValue,
      createInAppNotification: dto.createInAppNotification ?? true,
      requestedByUserId,
      idempotencyKey,
      status: 'QUEUED',
      totalRecipients: recipients.length,
    };
    const recipientData = recipients.flatMap((user) => {
      if (!user.email || !user.campaignEmailConsent?.consentedAt) return [];
      return [
        {
          userId: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          consentId: user.campaignEmailConsent.id,
          consentedAt: user.campaignEmailConsent.consentedAt,
          status: 'PENDING',
        },
      ];
    });

    let job;
    try {
      job = await this.repo.createCampaignJob(jobData, recipientData);
    } catch (error) {
      const duplicate = await this.repo.findCampaignJobByRequest(
        requestedByUserId,
        idempotencyKey,
      );
      if (duplicate) return this.campaignEnqueueResult(duplicate, true);
      throw error;
    }
    return this.campaignEnqueueResult(job, false);
  }

  async deliverCampaignRecipient(
    job: Pick<
      CampaignJob,
      | 'id'
      | 'subject'
      | 'templateHtml'
      | 'appUrl'
      | 'campaignName'
      | 'tags'
      | 'createInAppNotification'
      | 'requestedByUserId'
      | 'templateId'
    >,
    recipient: Pick<
      CampaignRecipient,
      | 'id'
      | 'userId'
      | 'email'
      | 'username'
      | 'firstName'
      | 'lastName'
      | 'consentId'
      | 'consentedAt'
    >,
  ): Promise<void> {
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      throw new ServiceUnavailableException(
        'SMTP campaign transport is unavailable.',
      );
    }
    const transporter = this.createSmtpTransporter(mailConfig);
    try {
      const { renderCampaignEmailHtml } =
        await import('./utils/email-content.js');
      const unsubscribeToken = createCampaignUnsubscribeToken(
        { consentId: recipient.consentId, consentedAt: recipient.consentedAt },
        this.config.getOrThrow<string>('JWT_SECRET'),
      );
      const unsubscribeUrl = new URL('/unsubscribe', job.appUrl);
      unsubscribeUrl.searchParams.set('token', unsubscribeToken);
      const campaignHtml = renderCampaignEmailHtml(job.templateHtml, {
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        username: recipient.username,
        email: recipient.email,
        appUrl: job.appUrl,
      });
      const personalizedHtml = `${campaignHtml}\n<p><a href="${escapeEmailHtml(unsubscribeUrl.toString())}">Unsubscribe / Odjava</a></p>`;
      await transporter.sendMail({
        from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
        to: recipient.email,
        subject: job.subject,
        text: this.convertHtmlToText(personalizedHtml),
        html: personalizedHtml,
        ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
      });
    } finally {
      transporter.close();
    }

    if (job.createInAppNotification) {
      try {
        await this.repo.createNotificationForEvent({
          eventId: `campaign:${job.id}:${recipient.id}`,
          userId: recipient.userId,
          data: {
            userId: recipient.userId,
            title: job.subject,
            body: job.campaignName || 'Nova email kampanja.',
            type: 'general',
            data: {
              campaignTemplateId: job.templateId,
              tags: job.tags as Prisma.InputJsonValue,
              source: 'email_campaign',
              requestedByUserId: job.requestedByUserId,
              campaignJobId: job.id,
            } as Prisma.InputJsonValue,
            channel: 'EMAIL',
            isRead: false,
          },
        });
      } catch (error) {
        const errorType = error instanceof Error ? error.name : 'Error';
        this.logger.warn(
          `Campaign in-app notification failed for recipient ${recipient.id} (${errorType}).`,
        );
      }
    }
  }

  private campaignEnqueueResult(
    job: Pick<CampaignJob, 'id' | 'status' | 'totalRecipients'>,
    duplicate: boolean,
  ) {
    return {
      ok: true,
      queued: true,
      jobId: job.id,
      status: job.status,
      totalTargeted: job.totalRecipients,
      delivered: 0,
      skipped: 0,
      duplicate,
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
    const appUrl = await this.resolveAppBaseUrl();
    const placeholderVars = {
      firstName: greetingName,
      appUrl,
      verificationCode: params.code,
    };
    const ph = (value: string) =>
      this.applyNotificationEmailPlaceholders(value, placeholderVars);
    const plainText = template.plainText
      ? ph(template.plainText)
      : `Poštovani ${greetingName}, vaš verifikacijski kod je ${params.code}. Kod važi 15 minuta.`;
    const html = this.buildDefaultEmailTemplate({
      title: ph(template.title || 'Verifikacija email adrese'),
      intro: ph(template.intro || `Poštovani ${greetingName},`),
      body: ph(
        template.body ||
          `Vaš verifikacijski kod je ${params.code}. Kod važi 15 minuta.`,
      ),
      ctaLabel: ph(template.ctaLabel || 'Otvori aplikaciju'),
      ctaUrl: ph(template.ctaUrl || appUrl),
      codeBlock: params.code,
      blocks: template.blocks?.map((block) => ({
        ...block,
        content: ph(block.content),
        ...(block.secondary ? { secondary: ph(block.secondary) } : {}),
      })),
      signature: mailConfig.signature,
    });
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: params.to,
      subject: ph(template.subject || subject),
      text: plainText,
      html,
      ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
    });
  }

  async assertInitialPasswordResetLinkEmailReady(): Promise<void> {
    await this.resolveInitialPasswordResetEmailContext();
  }

  async sendInitialPasswordResetLinkEmail(params: {
    to: string;
    firstName?: string | null;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const { mailConfig, appUrl } =
      await this.resolveInitialPasswordResetEmailContext();
    appUrl.searchParams.set('token', params.token);
    const resetUrl = appUrl.toString();
    const greeting = params.firstName?.trim() || 'korisniče';
    const expiryLabel = params.expiresAt.toLocaleString('bs-BA', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Sarajevo',
    });
    const subject = 'Sigurna promjena lozinke';
    const text =
      `Poštovani ${greeting},\n\n` +
      'Administrator je zatražio postavljanje nove lozinke za vaš nalog.\n' +
      `Otvorite ovaj link u roku od 7 dana: ${resetUrl}\n` +
      `Link ističe: ${expiryLabel} (Europe/Sarajevo).\n\n` +
      'Ako niste očekivali ovu poruku, obratite se salonu.';
    const html = `<div style="font-family:Arial,sans-serif;color:#2d1f1c;max-width:640px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:12px"><h1 style="font-size:22px">Sigurna promjena lozinke</h1><p>Poštovani ${escapeEmailHtml(greeting)},</p><p>Administrator je zatražio postavljanje nove lozinke za vaš nalog. Stara privremena lozinka više ne važi.</p><p><a href="${escapeEmailHtml(resetUrl)}" rel="noreferrer" style="display:inline-block;padding:12px 18px;background:#2d1f1c;color:#fff;text-decoration:none;border-radius:8px">Postavi novu lozinku</a></p><p>Link važi 7 dana i ističe ${escapeEmailHtml(expiryLabel)} (Europe/Sarajevo).</p><p>Ako niste očekivali ovu poruku, obratite se salonu.</p><hr/><p>${escapeEmailHtml(mailConfig.signature)}</p></div>`;
    const transporter = this.createSmtpTransporter(mailConfig);
    await transporter.sendMail({
      from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
      to: params.to,
      subject,
      text,
      html,
      ...(mailConfig.replyTo ? { replyTo: mailConfig.replyTo } : {}),
    });
  }

  private async resolveInitialPasswordResetEmailContext(): Promise<{
    mailConfig: MailConfig;
    appUrl: URL;
  }> {
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) {
      throw new ServiceUnavailableException(
        'Usluga e-pošte trenutno nije dostupna.',
      );
    }

    try {
      const configured = new URL(await this.resolveAppBaseUrl());
      const environment =
        this.config.get<string>('NODE_ENV')?.trim().toLowerCase() ||
        'development';
      if (
        !configured.hostname ||
        !['http:', 'https:'].includes(configured.protocol) ||
        configured.username ||
        configured.password ||
        (!['development', 'test'].includes(environment) &&
          configured.protocol !== 'https:')
      ) {
        throw new Error('Unsafe password-reset app URL.');
      }
      return {
        mailConfig,
        appUrl: new URL('/reset-password', configured.origin),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Link za promjenu lozinke nije moguće sigurno pripremiti.',
      );
    }
  }

  async sendPaymentReceiptEmail(params: {
    to: string;
    firstName?: string | null;
    publicReferenceCode: string;
    reservationId?: string | null;
    items: Array<{ name: string; unitPrice: number }>;
    actualPrice: number;
    tipAmount: number;
    serviceAmount: number;
    loyaltyDiscountAmount: number;
    stylistName?: string;
    completedAt: Date;
  }) {
    const mailConfig = await this.resolveMailConfig();
    if (!mailConfig) return;
    const transporter = this.createSmtpTransporter(mailConfig);
    const appUrl = await this.resolveAppBaseUrl();
    const greetingName = params.firstName?.trim() || 'korisniče';
    const template = await this.getEmailTemplateConfig('payment_receipt');
    const ctaUrl = params.reservationId
      ? `${appUrl}/moje-rezervacije/${encodeURIComponent(params.reservationId)}`
      : appUrl;
    const completedLabel = params.completedAt.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const receiptBody = buildPaymentReceiptBodyText({
      stylistName: params.stylistName,
      publicReferenceCode: params.publicReferenceCode,
      completedLabel,
      items: params.items,
      serviceAmount: params.serviceAmount,
      loyaltyDiscountAmount: params.loyaltyDiscountAmount,
      tipAmount: params.tipAmount,
      actualPrice: params.actualPrice,
    });
    const subject = template.subject || 'Potvrda uplate — Beauty Salon Nejra';
    const plainText =
      template.plainText ||
      `Poštovani ${greetingName}, vaša uplata od ${params.actualPrice.toFixed(2)} KM je evidentirana (ref. ${params.publicReferenceCode}). Detalji: ${ctaUrl}`;
    const html = this.buildDefaultEmailTemplate({
      title: template.title || 'Potvrda uplate',
      intro: template.intro || `Poštovani ${greetingName},`,
      body: template.body || receiptBody,
      ctaLabel:
        template.ctaLabel ||
        (params.reservationId ? 'Pogledaj rezervaciju' : 'Otvori aplikaciju'),
      ctaUrl: template.ctaUrl
        ? this.applyNotificationEmailPlaceholders(template.ctaUrl, {
            appUrl,
            reservationId: params.reservationId ?? '',
          })
        : ctaUrl,
      blocks: template.blocks?.map((block) => ({
        ...block,
        content: this.applyNotificationEmailPlaceholders(block.content, {
          appUrl,
          reservationId: params.reservationId ?? '',
        }),
        ...(block.secondary
          ? {
              secondary: this.applyNotificationEmailPlaceholders(block.secondary, {
                appUrl,
                reservationId: params.reservationId ?? '',
              }),
            }
          : {}),
      })),
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
    const ctaByType: Record<NotificationType, { label: string; url: string }> =
      {
        reservation_new: {
          label: 'Otvori rezervacije',
          url: adminReservationsUrl,
        },
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
        payment_receipt: {
          label: 'Pogledaj rezervaciju',
          url: reservationId
            ? `${appUrl}/moje-rezervacije/${encodeURIComponent(reservationId)}`
            : appUrl,
        },
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
      payment_receipt:
        'Vaša uplata je uspješno evidentirana. U prilogu su detalji plaćenih usluga.',
      general: 'Imate novu opću notifikaciju iz sistema.',
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
      blocks: template.blocks?.map((block) => ({
        ...block,
        content: ph(block.content),
        ...(block.secondary ? { secondary: ph(block.secondary) } : {}),
      })),
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
    return buildDefaultEmailTemplateHtml(params);
  }

  private async getEmailTemplateConfig(
    key: NotificationType | 'verification',
  ): Promise<EmailTemplateConfig> {
    const raw = await this.settings.getValue(`system_email_template_${key}`);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as EmailTemplateConfig;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      if (parsed.blocks === undefined) return parsed;
      const blocks = normalizeEmailContentBlocks(parsed.blocks);
      return blocks ? { ...parsed, blocks } : { ...parsed, blocks: undefined };
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
    const where: Prisma.UserWhereInput = {
      isEmailVerified: true,
      email: { not: null },
      campaignEmailConsent: {
        is: { optedIn: true, consentedAt: { not: null } },
      },
      ...((audience.onlyActive ?? true) ? { isActive: true } : {}),
      ...(audience.includeUserIds?.length || audience.excludeUserIds?.length
        ? {
            id: {
              ...(audience.includeUserIds?.length
                ? { in: audience.includeUserIds }
                : {}),
              ...(audience.excludeUserIds?.length
                ? { notIn: audience.excludeUserIds }
                : {}),
            },
          }
        : {}),
      ...(audience.roles?.length
        ? {
            userRoles: {
              some: { role: { name: { in: audience.roles } } },
            },
          }
        : {}),
    };

    return this.repo.findUsers({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        campaignEmailConsent: {
          select: { id: true, consentedAt: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: MAX_CAMPAIGN_RECIPIENTS + 1,
    });
  }

  private async resolveAppBaseUrl(): Promise<string> {
    const fromSettings = await this.settings.getValue('system_public_app_url');
    const fromEnv =
      this.config.get<string>('APP_PUBLIC_URL') ||
      this.config.get<string>('FRONTEND_URL');
    return (fromSettings || fromEnv || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
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
      connectionTimeoutMs: this.toNumber(
        connectionTimeoutRaw,
        10000,
        1000,
        120000,
      ),
      greetingTimeoutMs: this.toNumber(greetingTimeoutRaw, 10000, 1000, 120000),
      socketTimeoutMs: this.toNumber(socketTimeoutRaw, 20000, 1000, 300000),
      pool: this.toBoolean(poolRaw, true),
      maxConnections: this.toNumber(maxConnectionsRaw, 5, 1, 50),
      maxMessages: this.toNumber(maxMessagesRaw, 100, 1, 5000),
    };
  }
}
