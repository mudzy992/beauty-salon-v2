import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyLogMediaConsentPurpose,
  Prisma,
  UploadStorageClass,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGalleryCategoryDto } from './dto/create-category.dto';
import { CreateGalleryImageDto } from './dto/create-image.dto';
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from '../media-consent/media-consent.service';

const PUBLIC_GALLERY_IMAGE_WHERE: Prisma.GalleryImageWhereInput = {
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

@Injectable()
export class GalleryService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(dto: CreateGalleryCategoryDto) {
    return this.prisma.galleryCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
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
      include: {
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
      images,
    };
  }

  async updateCategory(
    id: string,
    dto: { name?: string; description?: string; sortOrder?: number },
  ) {
    await this.requireCategory(id);
    return this.prisma.galleryCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async removeCategory(id: string) {
    await this.requireCategory(id);
    await this.prisma.galleryCategory.delete({ where: { id } });
    return { deleted: true };
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
        'Javna galerija prima samo fotografije s izričitom saglasnošću klijenta.',
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

    return this.prisma.galleryImage.create({
      data: {
        categoryId: dto.categoryId,
        uploadId: dto.uploadId,
        title: dto.title,
        description: dto.description,
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
      select: { id: true },
    });
    if (!category) throw new NotFoundException('Kategorija nije pronađena.');
    return category;
  }
}
