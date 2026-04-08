import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import type { Prisma } from '@prisma/client'

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  createNotification(params: Prisma.NotificationCreateArgs) {
    return this.prisma.notification.create(params)
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

  upsertPushToken(params: Prisma.PushTokenUpsertArgs) {
    return this.prisma.pushToken.upsert(params)
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
