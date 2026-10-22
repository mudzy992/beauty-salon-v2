import { Injectable } from '@nestjs/common';
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
