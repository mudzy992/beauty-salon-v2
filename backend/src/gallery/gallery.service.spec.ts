jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DailyLogMediaConsentPurpose,
  UploadStorageClass,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { GalleryService } from './gallery.service';

const mockPrisma = {
  galleryCategory: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  galleryImage: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  dailyLogImage: {
    findMany: jest.fn(),
  },
  upload: {
    findUnique: jest.fn(),
  },
};

const mockUploads = {
  saveGalleryAsset: jest.fn(),
  deleteUnreferencedUpload: jest.fn(),
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
        { provide: UploadsService, useValue: mockUploads },
      ],
    }).compile();
    service = module.get<GalleryService>(GalleryService);
  });

  it('odbija drugu automatsku kategoriju uz jasno Conflict upozorenje', async () => {
    mockPrisma.galleryCategory.findFirst.mockResolvedValue({
      id: 'existing-auto-category',
      name: 'Prije/poslije',
    });

    await expect(
      service.createCategory({ name: 'Nova', autoPublishConsentedPairs: true }),
    ).rejects.toThrow(ConflictException);
    expect(mockPrisma.galleryCategory.create).not.toHaveBeenCalled();
  });

  it('prevodi DB unique zaštitu u jasnu grešku pri konkurentnom aktiviranju', async () => {
    mockPrisma.galleryCategory.findFirst.mockResolvedValue(null);
    mockPrisma.galleryCategory.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.createCategory({ name: 'Nova', autoPublishConsentedPairs: true }),
    ).rejects.toThrow(ConflictException);
  });

  it('odbija direktni manual upload bez potvrde da materijal nije klijentski', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue({
      id: 'manual-category',
      autoPublishConsentedPairs: false,
    });

    await expect(
      service.uploadNonClientImage(
        'manual-category',
        {} as Express.Multer.File,
        'owner-1',
        { nonClientAssetConfirmed: 'false' },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockUploads.saveGalleryAsset).not.toHaveBeenCalled();
  });

  it('veže non-client asset za ručno odabranu kategoriju', async () => {
    mockPrisma.galleryCategory.findUnique.mockResolvedValue({
      id: 'manual-category',
      autoPublishConsentedPairs: false,
    });
    mockUploads.saveGalleryAsset.mockResolvedValue({ id: 'upload-1' });
    mockPrisma.galleryImage.create.mockResolvedValue({
      id: 'gallery-image-1',
      categoryId: 'manual-category',
      uploadId: 'upload-1',
    });

    await expect(
      service.uploadNonClientImage(
        'manual-category',
        {} as Express.Multer.File,
        'owner-1',
        { nonClientAssetConfirmed: 'true' },
      ),
    ).resolves.toMatchObject({ uploadId: 'upload-1' });
    expect(mockUploads.saveGalleryAsset).toHaveBeenCalledWith(
      expect.anything(),
      'owner-1',
    );
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
    const query = mockPrisma.galleryCategory.findMany.mock.calls[0][0];
    const imageWhere = query.include.images.where;
    expect(imageWhere.OR).toHaveLength(2);
    expect(imageWhere.OR[0].upload).toEqual({
      storageClass: UploadStorageClass.PUBLIC,
      pathOriginal: { startsWith: 'gallery/' },
    });
    expect(imageWhere.OR[1].upload.consentCopyFor.is).toEqual(
      expect.objectContaining({
        purpose: DailyLogMediaConsentPurpose.PUBLIC_GALLERY,
        policyVersion: 'client-media-publication-v1',
        revokedAt: null,
        clientId: { not: null },
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
        title: 'Klijentsko ime koje se ne smije javno prikazati',
        description: 'Privatni kontekst',
      }),
    ).resolves.toEqual({ id: 'gallery-image-1' });
    expect(mockPrisma.galleryImage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: null, description: null }),
      }),
    );
  });

  it('removeImage baca NotFoundException kada slika ne postoji', async () => {
    mockPrisma.galleryImage.findUnique.mockResolvedValue(null);
    await expect(service.removeImage('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});
