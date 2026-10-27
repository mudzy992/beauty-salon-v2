import { Injectable } from '@nestjs/common'
import { UploadStorageClass } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  get user() {
    return this.prisma.user
  }

  findOwnedAvatarUpload(userId: string, avatarPath: string) {
    return this.prisma.upload.findFirst({
      where: {
        uploadedById: userId,
        storageClass: UploadStorageClass.PRIVATE,
        pathOriginal: { startsWith: 'private/avatars/' },
        OR: [
          { pathOriginal: avatarPath },
          { pathThumb: avatarPath },
          { pathSmall: avatarPath },
          { pathMedium: avatarPath },
        ],
      },
      select: {
        id: true,
        mimeType: true,
        pathThumb: true,
        pathSmall: true,
        pathMedium: true,
      },
    })
  }

  get role() {
    return this.prisma.role
  }

  get userRole() {
    return this.prisma.userRole
  }

  get stylistProfile() {
    return this.prisma.stylistProfile
  }

  get stylistService() {
    return this.prisma.stylistService
  }

  get stylistWorkingHours() {
    return this.prisma.stylistWorkingHours
  }

  get reservation() {
    return this.prisma.reservation
  }

  get reservationStylistResponse() {
    return this.prisma.reservationStylistResponse
  }

  get dailyLogEntry() {
    return this.prisma.dailyLogEntry
  }

  get review() {
    return this.prisma.review
  }

  get clientCancellationCount() {
    return this.prisma.clientCancellationCount
  }

  get incomeBookManualEntry() {
    return this.prisma.incomeBookManualEntry
  }

  transaction<T>(fn: Parameters<PrismaService['$transaction']>[0]) {
    return this.prisma.$transaction(fn as any) as Promise<T>
  }
}
