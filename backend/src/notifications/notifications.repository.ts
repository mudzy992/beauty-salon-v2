import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@prisma/client'

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(params: Prisma.NotificationCreateArgs) {
    return this.prisma.notification.create(params)
  }

  createNotificationForEvent(params: {
    eventId: string;
    userId: string;
    data: Prisma.NotificationUncheckedCreateInput;
  }) {
    return this.prisma.notification.upsert({
      where: {
        sourceEventId_userId: {
          sourceEventId: params.eventId,
          userId: params.userId,
        },
      },
      create: { ...params.data, sourceEventId: params.eventId },
      update: {},
    })
  }

  findNotificationsForUser(params: Prisma.NotificationFindManyArgs) {
    return this.prisma.notification.findMany(params)
  }

  findFirstNotification(params: Prisma.NotificationFindFirstArgs) {
    return this.prisma.notification.findFirst(params)
  }

  updateNotification(params: Prisma.NotificationUpdateArgs) {
    return this.prisma.notification.update(params)
  }

  findPreferences(params: Prisma.NotificationPreferenceFindManyArgs) {
    return this.prisma.notificationPreference.findMany(params)
  }

  findPreference(params: Prisma.NotificationPreferenceFindUniqueArgs) {
    return this.prisma.notificationPreference.findUnique(params)
  }

  upsertPreference(params: Prisma.NotificationPreferenceUpsertArgs) {
    return this.prisma.notificationPreference.upsert(params)
  }

  createCampaignJob(
    data: Prisma.CampaignJobUncheckedCreateInput,
    recipients: Array<Omit<Prisma.CampaignRecipientUncheckedCreateInput, 'jobId'>>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.campaignJob.create({ data })
      await tx.campaignRecipient.createMany({
        data: recipients.map((recipient) => ({ ...recipient, jobId: job.id })),
      })
      return job
    })
  }

  findCampaignJobByRequest(requestedByUserId: string, idempotencyKey: string) {
    return this.prisma.campaignJob.findUnique({
      where: { requestedByUserId_idempotencyKey: { requestedByUserId, idempotencyKey } },
    })
  }

  findCampaignEmailConsent(userId: string) {
    return this.prisma.campaignEmailConsent.findUnique({
      where: { userId },
      select: { optedIn: true, consentedAt: true, withdrawnAt: true },
    })
  }

  unsubscribeCampaignEmailConsent(consentId: string, consentedAt: Date) {
    return this.prisma.$transaction(async (tx) => {
      const consent = await tx.campaignEmailConsent.findUnique({
        where: { id: consentId },
        select: { id: true, userId: true, optedIn: true, consentedAt: true },
      })
      if (
        !consent ||
        !consent.consentedAt ||
        consent.consentedAt.getTime() !== consentedAt.getTime()
      ) {
        return false
      }
      if (!consent.optedIn) return true

      const occurredAt = new Date()
      const changed = await tx.campaignEmailConsent.updateMany({
        where: { id: consentId, optedIn: true, consentedAt },
        data: { optedIn: false, withdrawnAt: occurredAt },
      })
      if (changed.count !== 1) {
        const latest = await tx.campaignEmailConsent.findUnique({
          where: { id: consentId },
          select: { optedIn: true, consentedAt: true },
        })
        return Boolean(
          latest &&
            !latest.optedIn &&
            latest.consentedAt?.getTime() === consentedAt.getTime(),
        )
      }

      await tx.campaignEmailConsentEvent.create({
        data: {
          consentId,
          userId: consent.userId,
          action: 'OPT_OUT',
          source: 'EMAIL_UNSUBSCRIBE',
          occurredAt,
        },
      })
      return true
    })
  }

  setCampaignEmailConsent(userId: string, optedIn: boolean) {
    return this.prisma.$transaction(async (tx) => {
      await tx.campaignEmailConsent.upsert({
        where: { userId },
        create: { userId, optedIn: false },
        update: {},
      })

      const occurredAt = new Date()
      const changed = await tx.campaignEmailConsent.updateMany({
        where: { userId, optedIn: { not: optedIn } },
        data: {
          optedIn,
          ...(optedIn
            ? { consentedAt: occurredAt, withdrawnAt: null }
            : { withdrawnAt: occurredAt }),
        },
      })
      const consent = await tx.campaignEmailConsent.findUniqueOrThrow({
        where: { userId },
      })

      if (changed.count === 1) {
        await tx.campaignEmailConsentEvent.create({
          data: {
            consentId: consent.id,
            userId,
            action: optedIn ? 'OPT_IN' : 'OPT_OUT',
            source: 'ACCOUNT_SETTINGS',
            occurredAt,
          },
        })
      }
      return consent
    })
  }

  upsertPushToken(params: Prisma.PushTokenUpsertArgs) {
    return this.prisma.pushToken.upsert(params)
  }

  deletePushToken(params: Prisma.PushTokenDeleteArgs) {
    return this.prisma.pushToken.delete(params)
  }

  findPushTokens(params: Prisma.PushTokenFindManyArgs) {
    return this.prisma.pushToken.findMany(params)
  }

  findUser<T extends Prisma.UserFindUniqueArgs>(params: T) {
    return this.prisma.user.findUnique(
      params,
    ) as Promise<Prisma.UserGetPayload<T> | null>
  }

  findUsers<T extends Prisma.UserFindManyArgs>(params: T) {
    return this.prisma.user.findMany(params) as Promise<
      Array<Prisma.UserGetPayload<T>>
    >
  }
}
