import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DailyLogMediaConsentPurpose,
  UploadStorageClass,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GalleryService } from './gallery.service';

const mockPrisma = {
  galleryCategory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  galleryImage: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  upload: {
    findUnique: jest.fn(),
  },
};

const activeConsent = {
  purpose: DailyLogMediaConsentPurpose.PUBLIC_GALLERY,
  policyVersion: 'client-media-publication-v1',
  revokedAt: null,
  clientId: 'client-1',
};

function linkedImage(overrides: Record<string, unknown> = {}) {
  return {
    isBefore: true,
    isAfter: false,
    dailyLogEntry: {
      clientId: 'client-1',
      kind: 'SERVICE',
      status: 'COMPLETED',
      deletedAt: null,
    },
    ...overrides,
  };
}

describe('GalleryService', () => {
  let service: GalleryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GalleryService>(GalleryService);
  });

  it('findOneCategory baca NotFoundException kada kategorija ne postoji', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue(null);
    await expect(service.findOneCategory('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('ne izlaže neconsentovan PUBLIC upload kroz galeriju', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue({
      id: 'category-1',
      images: [
        {
          id: 'gallery-image-1',
          upload: {
            storageClass: UploadStorageClass.PUBLIC,
            consentCopyFor: null,
          },
        },
      ],
    });

    await expect(service.findOneCategory('category-1')).resolves.toMatchObject({
      images: [],
    });
  });

  it.each([
    {
      description: 'image is not marked before or after',
      image: { isBefore: false, isAfter: false },
    },
    {
      description: 'linked entry is not a service',
      image: { kind: 'DEBT_PAYMENT' },
    },
  ])(
    'does not expose an ineligible consented gallery image ($description)',
    async ({ image }) => {
      const linked = linkedImage(
        'kind' in image
          ? { dailyLogEntry: { ...linkedImage().dailyLogEntry, ...image } }
          : image,
      );
      mockPrisma.galleryCategory.findUnique.mockResolvedValue({
        id: 'category-1',
        images: [
          {
            id: 'gallery-image-1',
            upload: {
              storageClass: UploadStorageClass.CONSENTED_PUBLIC,
              consentCopyFor: {
                id: 'consent-1',
                ...activeConsent,
                dailyLogImage: linked,
              },
            },
          },
        ],
      });

      await expect(
        service.findOneCategory('category-1'),
      ).resolves.toMatchObject({ images: [] });
    },
  );

  it('counts only active consent on eligible completed service images', async () => {
    mockPrisma.galleryCategory.findMany.mockResolvedValue([]);

    await expect(service.findAllCategories()).resolves.toEqual([]);
    expect(mockPrisma.galleryCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          images: {
            where: {
              upload: {
                storageClass: UploadStorageClass.CONSENTED_PUBLIC,
                consentCopyFor: {
                  is: expect.objectContaining({
                    purpose: DailyLogMediaConsentPurpose.PUBLIC_GALLERY,
                    policyVersion: 'client-media-publication-v1',
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
                  }),
                },
              },
            },
            select: { id: true },
          },
        },
      }),
    );
  });

  it('odbija direktno dodavanje običnog PUBLIC fajla u javnu galeriju', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue({
      id: 'category-1',
    });
    mockPrisma.upload.findUnique.mockResolvedValue({
      storageClass: UploadStorageClass.PUBLIC,
      consentCopyFor: null,
    });

    await expect(
      service.addImage({
        categoryId: 'category-1',
        uploadId: 'upload-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.galleryImage.create).not.toHaveBeenCalled();
  });

  it('odbija consent copy nakon opoziva saglasnosti', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue({
      id: 'category-1',
    });
    mockPrisma.upload.findUnique.mockResolvedValue({
      storageClass: UploadStorageClass.CONSENTED_PUBLIC,
      consentCopyFor: {
        ...activeConsent,
        revokedAt: new Date(),
        dailyLogImage: linkedImage(),
      },
    });

    await expect(
      service.addImage({
        categoryId: 'category-1',
        uploadId: 'upload-1',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.galleryImage.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      description: 'image is not marked before or after',
      image: { isBefore: false, isAfter: false },
    },
    {
      description: 'linked entry is not a service',
      image: { kind: 'DEBT_PAYMENT' },
    },
  ])(
    'rejects adding a consented image outside Gallery eligibility ($description)',
    async ({ image }) => {
      const linked = linkedImage(
        'kind' in image
          ? { dailyLogEntry: { ...linkedImage().dailyLogEntry, ...image } }
          : image,
      );
      mockPrisma.galleryCategory.findUnique.mockResolvedValue({
        id: 'category-1',
      });
      mockPrisma.upload.findUnique.mockResolvedValue({
        storageClass: UploadStorageClass.CONSENTED_PUBLIC,
        consentCopyFor: { ...activeConsent, dailyLogImage: linked },
      });

      await expect(
        service.addImage({
          categoryId: 'category-1',
          uploadId: 'upload-1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.galleryImage.create).not.toHaveBeenCalled();
    },
  );

  it('dozvoljava dodavanje samo aktivne, odgovarajuće saglasnosti', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue({
      id: 'category-1',
    });
    mockPrisma.upload.findUnique.mockResolvedValue({
      storageClass: UploadStorageClass.CONSENTED_PUBLIC,
      consentCopyFor: { ...activeConsent, dailyLogImage: linkedImage() },
    });
    mockPrisma.galleryImage.create.mockResolvedValue({ id: 'gallery-image-1' });

    await expect(
      service.addImage({
        categoryId: 'category-1',
        uploadId: 'upload-1',
      }),
    ).resolves.toEqual({ id: 'gallery-image-1' });
    expect(mockPrisma.galleryImage.create).toHaveBeenCalledTimes(1);
  });

  it('removeImage baca NotFoundException kada slika ne postoji', async () => {
    mockPrisma.galleryImage.findUnique.mockResolvedValue(null);
    await expect(service.removeImage('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
