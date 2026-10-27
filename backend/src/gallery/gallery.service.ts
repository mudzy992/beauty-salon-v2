import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyLogMediaConsentPurpose,
  Prisma,
  UploadStorageClass,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryCategoryDto, UpdateGalleryCategoryDto } from './dto/create-category.dto';
import { CreateGalleryImageDto } from './dto/create-image.dto';
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from '../media-consent/media-consent.constants';
import { UploadsService } from '../uploads/uploads.service';

const CONSENTED_GALLERY_IMAGE_WHERE: Prisma.GalleryImageWhereInput = {
  upload: {
    storageClass: UploadStorageClass.CONSENTED_PUBLIC,
    consentCopyFor: {
      is: {
        purpose: DailyLogMediaConsentPurpose.PUBLIC_GALLERY,
        policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        revokedAt: null,
        clientId: { not: null },
        dailyLogImage: {
          is: {
            OR: [{ isBefore: true }, { isAfter: true }],
            dailyLogEntry: {
              kind: 'SERVICE',
              status: 'COMPLETED',
              deletedAt: null,
              clientId: { not: null },
            },
          },
        },
      },
    },
  },
};

const PUBLIC_GALLERY_IMAGE_WHERE: Prisma.GalleryImageWhereInput = {
  OR: [
    {
      upload: {
        storageClass: UploadStorageClass.PUBLIC,
        pathOriginal: { startsWith: 'gallery/' },
      },
    },
    CONSENTED_GALLERY_IMAGE_WHERE,
  ],
};

const CATEGORY_FIELDS = {
  id: true,
  name: true,
  description: true,
  sortOrder: true,
  autoPublishConsentedPairs: true,
} as const;

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async createCategory(dto: CreateGalleryCategoryDto) {
    if (dto.autoPublishConsentedPairs) {
      await this.assertAutoPublishCategoryAvailable();
    }
    try {
      return await this.prisma.galleryCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          sortOrder: dto.sortOrder ?? 0,
          autoPublishConsentedPairs: dto.autoPublishConsentedPairs ?? false,
        },
      });
    } catch (error) {
      if (dto.autoPublishConsentedPairs && this.isUniqueConstraintError(error)) {
        throw this.autoPublishConflict();
      }
      throw error;
    }
  }

  async findAllCategories() {
    const categories = await this.prisma.galleryCategory.findMany({
      include: {
        images: {
          where: PUBLIC_GALLERY_IMAGE_WHERE,
          select: { id: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
    return categories.map(({ images, ...category }) => ({
      ...category,
      _count: { images: images.length },
    }));
  }

  async findOneCategory(id: string) {
    const category = await this.prisma.galleryCategory.findUnique({
      where: { id },
      select: {
        ...CATEGORY_FIELDS,
        images: {
          where: PUBLIC_GALLERY_IMAGE_WHERE,
          include: {
            upload: {
              select: {
                id: true,
                pathOriginal: true,
                pathThumb: true,
                pathMedium: true,
                storageClass: true,
                consentCopyFor: {
                  select: {
                    id: true,
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
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!category) throw new NotFoundException('Kategorija nije pronađena.');

    const images = category.images.flatMap((image) => {
      const upload = image.upload;
      if (
        upload.storageClass === UploadStorageClass.PUBLIC &&
        typeof upload.pathOriginal === 'string' &&
        upload.pathOriginal.startsWith('gallery/')
      ) {
        return [
          {
            id: image.id,
            title: image.title,
            description: image.description,
            sortOrder: image.sortOrder,
            upload: {
              pathOriginal: upload.pathOriginal,
              pathThumb: upload.pathThumb,
              pathMedium: upload.pathMedium,
            },
          },
        ];
      }

      const consent = upload.consentCopyFor;
      const dailyLogImage = consent?.dailyLogImage;
      const entry = dailyLogImage?.dailyLogEntry;
      if (
        upload.storageClass !== UploadStorageClass.CONSENTED_PUBLIC ||
        !consent ||
        consent.revokedAt !== null ||
        consent.purpose !== DailyLogMediaConsentPurpose.PUBLIC_GALLERY ||
        consent.policyVersion !== CLIENT_MEDIA_PUBLICATION_POLICY_VERSION ||
        !consent.clientId ||
        !dailyLogImage ||
        (!dailyLogImage.isBefore && !dailyLogImage.isAfter) ||
        !entry ||
        consent.clientId !== entry.clientId ||
        entry.kind !== 'SERVICE' ||
        entry.status !== 'COMPLETED' ||
        entry.deletedAt !== null
      ) {
        return [];
      }
      const route = `/api/media/consents/${consent.id}/file`;
      return [
        {
          id: image.id,
          title: null,
          description: null,
          sortOrder: image.sortOrder,
          upload: { pathOriginal: route, pathThumb: null, pathMedium: null },
        },
      ];
    });

    return {
      id: category.id,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      autoPublishConsentedPairs: category.autoPublishConsentedPairs,
      images,
    };
  }

  async updateCategory(id: string, dto: UpdateGalleryCategoryDto) {
    const category = await this.requireCategory(id);
    if (dto.autoPublishConsentedPairs === true) {
      await this.assertAutoPublishCategoryAvailable(id);
    }
    try {
      return await this.prisma.galleryCategory.update({
        where: { id },
        data: {
          ...(dto.name != null && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
          ...(dto.autoPublishConsentedPairs !== undefined && {
            autoPublishConsentedPairs: dto.autoPublishConsentedPairs,
          }),
        },
      });
    } catch (error) {
      if (
        dto.autoPublishConsentedPairs === true &&
        this.isUniqueConstraintError(error)
      ) {
        throw this.autoPublishConflict();
      }
      throw error;
    }
  }

  async removeCategory(id: string) {
    await this.requireCategory(id);
    await this.prisma.galleryCategory.delete({ where: { id } });
    return { deleted: true };
  }

  async getEligibleConsentedImages() {
    const images = await this.prisma.dailyLogImage.findMany({
      where: {
        OR: [{ isBefore: true }, { isAfter: true }],
        dailyLogEntry: {
          is: {
            kind: 'SERVICE',
            status: 'COMPLETED',
            deletedAt: null,
            clientId: { not: null },
          },
        },
        consent: {
          is: {
            purpose: DailyLogMediaConsentPurpose.PUBLIC_GALLERY,
            policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
            revokedAt: null,
            clientId: { not: null },
            publishedUpload: {
              is: { storageClass: UploadStorageClass.CONSENTED_PUBLIC },
            },
          },
        },
      },
      select: {
        id: true,
        isBefore: true,
        isAfter: true,
        consent: {
          select: { id: true, clientId: true, publishedUploadId: true },
        },
        dailyLogEntry: {
          select: {
            clientId: true,
            date: true,
            service: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return images.flatMap((image) => {
      const consent = image.consent;
      if (
        !consent?.id ||
        !consent.publishedUploadId ||
        !consent.clientId ||
        consent.clientId !== image.dailyLogEntry.clientId
      ) {
        return [];
      }
      return [
        {
          imageId: image.id,
          uploadId: consent.publishedUploadId,
          consentId: consent.id,
          isBefore: image.isBefore,
          isAfter: image.isAfter,
          serviceName: image.dailyLogEntry.service.name,
          serviceDate: image.dailyLogEntry.date,
          previewUrl: `/api/media/consents/${consent.id}/file`,
        },
      ];
    });
  }

  async addImage(dto: CreateGalleryImageDto) {
    await this.requireCategory(dto.categoryId);
    const upload = await this.prisma.upload.findUnique({
      where: { id: dto.uploadId },
      include: {
        consentCopyFor: {
          include: { dailyLogImage: { include: { dailyLogEntry: true } } },
        },
      },
    });
    if (!upload) throw new NotFoundException('Upload nije pronađen.');
    if (upload.storageClass !== UploadStorageClass.CONSENTED_PUBLIC) {
      throw new BadRequestException(
        'Klijentske fotografije u galeriju se dodaju samo preko aktivnog birača saglasnosti.',
      );
    }
    const consent = upload.consentCopyFor;
    if (
      !consent ||
      consent.revokedAt !== null ||
      consent.policyVersion !== CLIENT_MEDIA_PUBLICATION_POLICY_VERSION ||
      consent.purpose !== DailyLogMediaConsentPurpose.PUBLIC_GALLERY ||
      !consent.clientId ||
      !consent.dailyLogImage ||
      (!consent.dailyLogImage.isBefore && !consent.dailyLogImage.isAfter) ||
      consent.clientId !== consent.dailyLogImage.dailyLogEntry.clientId ||
      consent.dailyLogImage.dailyLogEntry.kind !== 'SERVICE' ||
      consent.dailyLogImage.dailyLogEntry.status !== 'COMPLETED' ||
      consent.dailyLogImage.dailyLogEntry.deletedAt !== null
    ) {
      throw new BadRequestException(
        'Za galeriju je dozvoljena samo fotografija s aktivnom saglasnošću klijenta.',
      );
    }

    const existing = await this.prisma.galleryImage.findFirst({
      where: { categoryId: dto.categoryId, uploadId: dto.uploadId },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Fotografija je već dodana u ovu kategoriju.');
    }

    return this.prisma.galleryImage.create({
      data: {
        categoryId: dto.categoryId,
        uploadId: dto.uploadId,
        // Consent covers the photo-only gallery use, not arbitrary captions or client metadata.
        title: null,
        description: null,
        sortOrder: dto.sortOrder ?? 0,
      },
      select: {
        id: true,
        categoryId: true,
        uploadId: true,
        title: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  async uploadNonClientImage(
    categoryId: string,
    file: Express.Multer.File,
    uploadedById: string,
    options: {
      nonClientAssetConfirmed: string | undefined;
      title?: string;
      description?: string;
      sortOrder?: number;
    },
  ) {
    await this.requireCategory(categoryId);
    if (options.nonClientAssetConfirmed !== 'true') {
      throw new BadRequestException(
        'Potvrdite da direktno uploadana fotografija ne prikazuje klijenta.',
      );
    }

    const uploaded = await this.uploads.saveGalleryAsset(file, uploadedById);
    try {
      return await this.prisma.galleryImage.create({
        data: {
          categoryId,
          uploadId: uploaded.id,
          title: options.title,
          description: options.description,
          sortOrder: options.sortOrder ?? 0,
        },
        select: {
          id: true,
          categoryId: true,
          uploadId: true,
          title: true,
          description: true,
          sortOrder: true,
        },
      });
    } catch (error) {
      await this.uploads.deleteUnreferencedUpload(uploaded.id).catch(() => undefined);
      throw error;
    }
  }

  async updateImage(
    id: string,
    dto: { title?: string; description?: string; sortOrder?: number },
  ) {
    const img = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!img) throw new NotFoundException('Slika nije pronađena.');
    return this.prisma.galleryImage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
      select: {
        id: true,
        categoryId: true,
        uploadId: true,
        title: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  async removeImage(id: string) {
    const img = await this.prisma.galleryImage.findUnique({ where: { id } });
    if (!img) throw new NotFoundException('Slika nije pronađena.');
    await this.prisma.galleryImage.delete({ where: { id } });
    return { deleted: true };
  }

  private async requireCategory(id: string) {
    const category = await this.prisma.galleryCategory.findUnique({
      where: { id },
      select: { id: true, autoPublishConsentedPairs: true },
    });
    if (!category) throw new NotFoundException('Kategorija nije pronađena.');
    return category;
  }

  private async assertAutoPublishCategoryAvailable(exceptId?: string) {
    const active = await this.prisma.galleryCategory.findFirst({
      where: {
        autoPublishConsentedPairs: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true, name: true },
    });
    if (active) throw this.autoPublishConflict(active.name);
  }

  private autoPublishConflict(activeName?: string) {
    const activeText = activeName ? ` („${activeName}“)` : '';
    return new ConflictException(
      `Već postoji aktivna automatska kategorija${activeText}. Isključite je prije aktiviranja druge.`,
    );
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
