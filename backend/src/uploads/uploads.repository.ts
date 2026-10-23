import { Injectable } from '@nestjs/common';
import { UploadStorageClass } from '@prisma/client';
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from '../media-consent/media-consent.constants';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class UploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: Prisma.UploadCreateArgs) {
    return this.prisma.upload.create(params);
  }

  findFirstByPathOriginal(pathOriginal: string) {
    return this.prisma.upload.findFirst({ where: { pathOriginal } });
  }

  findById(id: string) {
    return this.prisma.upload.findUnique({ where: { id } });
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
        pathOriginal: true,
        pathThumb: true,
        pathSmall: true,
        pathMedium: true,
        uploadedById: true,
        storageClass: true,
      },
    });
  }

  async findPublicAvatarUpload(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true, isAvatarPublic: true },
    });
    if (!user?.isAvatarPublic || !user.avatar) return null;
    const upload = await this.prisma.upload.findFirst({
      where: {
        uploadedById: userId,
        storageClass: UploadStorageClass.PRIVATE,
        pathOriginal: { startsWith: 'private/avatars/' },
        OR: [
          { pathOriginal: user.avatar },
          { pathThumb: user.avatar },
          { pathSmall: user.avatar },
          { pathMedium: user.avatar },
        ],
      },
      select: {
        mimeType: true,
        pathOriginal: true,
        pathThumb: true,
        pathSmall: true,
        pathMedium: true,
      },
    });
    return upload ? { avatar: user.avatar, upload } : null;
  }

  findByStoredPath(filePath: string) {
    return this.prisma.upload.findFirst({
      where: {
        OR: [
          { pathOriginal: filePath },
          { pathThumb: filePath },
          { pathSmall: filePath },
          { pathMedium: filePath },
        ],
      },
    });
  }

  async canReadPrivateUpload(
    uploadId: string,
    userId: string,
    pathVariants: string[],
  ): Promise<boolean> {
    const [avatarCount, stylistImageCount, clientImageCount, consentCopy] =
      await Promise.all([
        this.prisma.user.count({
          where: { id: userId, avatar: { in: pathVariants } },
        }),
        this.prisma.dailyLogImage.count({
          where: {
            uploadId,
            dailyLogEntry: {
              deletedAt: null,
              stylistProfile: { userId },
            },
          },
        }),
        this.prisma.dailyLogImage.count({
          where: {
            uploadId,
            dailyLogEntry: {
              clientId: userId,
              status: 'COMPLETED',
              deletedAt: null,
            },
          },
        }),
        this.prisma.dailyLogImageConsent.findUnique({
          where: { publishedUploadId: uploadId },
          select: {
            clientId: true,
            purpose: true,
            policyVersion: true,
            revokedAt: true,
            dailyLogImage: {
              select: {
                isBefore: true,
                isAfter: true,
                dailyLogEntry: {
                  select: {
                    clientId: true,
                    kind: true,
                    status: true,
                    deletedAt: true,
                    stylistProfile: { select: { userId: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

    const consentEntry = consentCopy?.dailyLogImage?.dailyLogEntry;
    const hasValidConsentRelationship = Boolean(
      consentCopy &&
      consentCopy.clientId &&
      consentEntry &&
      consentCopy.clientId === consentEntry.clientId &&
      consentCopy.purpose === 'PUBLIC_GALLERY' &&
      consentCopy.policyVersion === CLIENT_MEDIA_PUBLICATION_POLICY_VERSION &&
      consentCopy.revokedAt === null &&
      (consentCopy.dailyLogImage?.isBefore ||
        consentCopy.dailyLogImage?.isAfter) &&
      consentEntry.kind === 'SERVICE' &&
      consentEntry.status === 'COMPLETED' &&
      consentEntry.deletedAt === null &&
      (consentCopy.clientId === userId ||
        consentEntry.stylistProfile.userId === userId),
    );

    return (
      avatarCount > 0 ||
      stylistImageCount > 0 ||
      clientImageCount > 0 ||
      hasValidConsentRelationship
    );
  }

  async hasReferences(uploadId: string, filePaths: string[]): Promise<boolean> {
    const normalizedPaths = filePaths
      .map((filePath) =>
        filePath.trim().replace(/\\/g, '/').replace(/^\/+/, ''),
      )
      .filter(Boolean);
    const pathVariants = Array.from(
      new Set(
        normalizedPaths.flatMap((filePath) => {
          const withoutUploadsPrefix = filePath.replace(/^uploads\//, '');
          return [
            filePath,
            `/${filePath}`,
            `uploads/${withoutUploadsPrefix}`,
            `/uploads/${withoutUploadsPrefix}`,
          ];
        }),
      ),
    );
    const contentPathFragments = Array.from(
      new Set(
        normalizedPaths
          .map((filePath) => filePath.replace(/^uploads\//, ''))
          .filter(Boolean),
      ),
    );

    const references = await Promise.all([
      this.prisma.dailyLogImage.count({ where: { uploadId } }),
      this.prisma.expenseAttachment.count({ where: { uploadId } }),
      this.prisma.galleryImage.count({ where: { uploadId } }),
      this.prisma.dailyLogImageConsent.count({
        where: { publishedUploadId: uploadId },
      }),
      this.prisma.expense.count({ where: { invoiceUploadId: uploadId } }),
      this.prisma.user.count({
        where: {
          OR: [
            { avatar: { in: pathVariants } },
            ...contentPathFragments.map((fragment) => ({
              avatar: { contains: fragment },
            })),
          ],
        },
      }),
      this.prisma.salonSettings.count({
        where: {
          OR: [
            { logo: { in: pathVariants } },
            ...contentPathFragments.map((fragment) => ({
              logo: { contains: fragment },
            })),
          ],
        },
      }),
      this.prisma.service.count({
        where: {
          OR: [
            { heroImage: { in: pathVariants } },
            ...contentPathFragments.map((fragment) => ({
              heroImage: { contains: fragment },
            })),
          ],
        },
      }),
      this.prisma.blogPost.count({
        where: {
          OR: [
            { heroImage: { in: pathVariants } },
            { ogImage: { in: pathVariants } },
            ...contentPathFragments.flatMap((fragment) => [
              { heroImage: { contains: fragment } },
              { ogImage: { contains: fragment } },
              { content: { contains: fragment } },
            ]),
          ],
        },
      }),
      this.prisma.appSetting.count({
        where: {
          key: 'app_logo',
          OR: [
            { value: { in: pathVariants } },
            ...contentPathFragments.map((fragment) => ({
              value: { contains: fragment },
            })),
          ],
        },
      }),
      this.prisma.appRelease.count({
        where: {
          OR: [
            { apkPath: { in: pathVariants } },
            ...contentPathFragments.map((fragment) => ({
              apkPath: { contains: fragment },
            })),
          ],
        },
      }),
      this.prisma.upload.count({
        where: {
          id: { not: uploadId },
          OR: [
            { pathOriginal: { in: pathVariants } },
            { pathThumb: { in: pathVariants } },
            { pathSmall: { in: pathVariants } },
            { pathMedium: { in: pathVariants } },
          ],
        },
      }),
    ]);

    return references.some((count) => count > 0);
  }

  deleteById(id: string) {
    return this.prisma.upload.delete({ where: { id } });
  }
}
