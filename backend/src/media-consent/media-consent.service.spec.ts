import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DailyLogMediaConsentAction, UploadStorageClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
  MediaConsentService,
} from './media-consent.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const tx = {
  dailyLogImageConsent: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  dailyLogImageConsentEvent: { create: jest.fn() },
};
const prisma = {
  dailyLogImage: { findMany: jest.fn(), findUnique: jest.fn() },
  dailyLogImageConsent: { findUnique: jest.fn() },
  galleryCategory: { findFirst: jest.fn() },
  $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
    callback(tx),
  ),
};
const uploads = {
  createConsentDerivative: jest.fn(),
  deleteUnreferencedUpload: jest.fn(),
};
const client = { sub: 'client-1', roles: ['CLIENT'] };
const owner = { sub: 'owner-1', roles: ['OWNER'] };

function imageRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'image-1',
    uploadId: 'upload-original-1',
    isBefore: true,
    isAfter: false,
    description: null,
    upload: {
      id: 'upload-original-1',
      pathOriginal: 'private/daily-log/2026/10/before.jpg',
      mimeType: 'image/jpeg',
      storageClass: UploadStorageClass.PRIVATE,
      uploadedById: 'stylist-1',
    },
    consent: null,
    dailyLogEntry: {
      clientId: 'client-1',
      kind: 'SERVICE',
      status: 'COMPLETED',
      deletedAt: null,
    },
    ...overrides,
  };
}

function consentedListImage(
  id: string,
  isBefore: boolean,
  isAfter: boolean,
) {
  return imageRecord({
    id,
    isBefore,
    isAfter,
    consent: {
      id: `consent-${id}`,
      clientId: 'client-1',
      purpose: 'PUBLIC_GALLERY',
      policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
      revokedAt: null,
      publishedUploadId: `published-${id}`,
      consentedAt: new Date('2026-10-22T12:00:00.000Z'),
      publishedUpload: {
        storageClass: UploadStorageClass.CONSENTED_PUBLIC,
        galleryImages: [],
      },
    },
    dailyLogEntry: {
      id: 'entry-1',
      clientId: 'client-1',
      kind: 'SERVICE',
      status: 'COMPLETED',
      deletedAt: null,
      date: new Date('2026-10-22T10:00:00.000Z'),
      completedAt: new Date('2026-10-22T11:00:00.000Z'),
      service: { name: 'Usluga' },
    },
  });
}

describe('MediaConsentService', () => {
  let service: MediaConsentService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaConsentService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadsService, useValue: uploads },
      ],
    }).compile();
    service = module.get(MediaConsentService);
  });

  it('requires the authenticated client role for the consent inbox', async () => {
    await expect(service.listForClient(owner)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.dailyLogImage.findMany).not.toHaveBeenCalled();
  });

  it('reports an auto-published pair only when two distinct images have active consent', async () => {
    prisma.dailyLogImage.findMany.mockResolvedValue([
      consentedListImage('before-image', true, false),
      consentedListImage('after-image', false, true),
    ]);
    prisma.galleryCategory.findFirst.mockResolvedValue({
      id: 'auto-category',
      name: 'Rezultati',
    });

    const result = await service.listForClient(client);

    expect(result.active).toHaveLength(2);
    expect(result.active.every((image) => image.isPublished)).toBe(true);
    expect(
      result.active.every((image) =>
        image.publishedCategories.some((category) => category.id === 'auto-category'),
      ),
    ).toBe(true);
  });

  it('does not mark one photo with both flags as a published pair', async () => {
    prisma.dailyLogImage.findMany.mockResolvedValue([
      consentedListImage('same-image', true, true),
    ]);
    prisma.galleryCategory.findFirst.mockResolvedValue({
      id: 'auto-category',
      name: 'Rezultati',
    });

    const result = await service.listForClient(client);

    expect(result.active).toHaveLength(1);
    expect(result.active[0]?.isPublished).toBe(false);
    expect(result.active[0]?.publishedCategories).toEqual([]);
  });

  it('rejects unsupported policy versions before reading or copying media', async () => {
    await expect(
      service.grantForClient('image-1', 'draft-v0', client),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.dailyLogImage.findUnique).not.toHaveBeenCalled();
    expect(uploads.createConsentDerivative).not.toHaveBeenCalled();
  });

  it('allows only the linked client on a completed, undeleted service image', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(
      imageRecord({
        dailyLogEntry: {
          clientId: 'another-client',
          kind: 'SERVICE',
          status: 'COMPLETED',
          deletedAt: null,
        },
      }),
    );
    await expect(
      service.grantForClient(
        'image-1',
        CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        client,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(uploads.createConsentDerivative).not.toHaveBeenCalled();
  });

  it('rejects consent for a completed service image without a before/after flag', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(
      imageRecord({ isBefore: false, isAfter: false }),
    );

    await expect(
      service.grantForClient(
        'image-1',
        CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        client,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(uploads.createConsentDerivative).not.toHaveBeenCalled();
  });

  it('creates a sanitized derivative and immutable grant event for the linked client', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord());
    uploads.createConsentDerivative.mockResolvedValue({
      id: 'consented-copy-1',
      pathOriginal: 'consented/2026/10/copy.webp',
    });
    tx.dailyLogImageConsent.findUnique.mockResolvedValue(null);
    tx.dailyLogImageConsent.create.mockResolvedValue({
      id: 'consent-1',
      consentedAt: new Date('2026-10-22T12:00:00.000Z'),
    });

    await expect(
      service.grantForClient(
        'image-1',
        CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        client,
      ),
    ).resolves.toEqual({
      active: true,
      consentedAt: '2026-10-22T12:00:00.000Z',
    });
    expect(uploads.createConsentDerivative).toHaveBeenCalledWith(
      'upload-original-1',
    );
    expect(tx.dailyLogImageConsent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dailyLogImageId: 'image-1',
        clientId: 'client-1',
        policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        publishedUploadId: 'consented-copy-1',
      }),
    });
    expect(tx.dailyLogImageConsentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        consentId: 'consent-1',
        action: DailyLogMediaConsentAction.GRANTED,
        actorId: 'client-1',
        source: 'CLIENT_APP',
      }),
    });
  });

  it('reuses the retained derivative after a prior revocation and logs a new grant', async () => {
    const prior = {
      id: 'consent-1',
      clientId: 'client-1',
      policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
      publishedUploadId: 'consented-copy-1',
      revokedAt: new Date('2026-10-21T12:00:00.000Z'),
    };
    prisma.dailyLogImage.findUnique.mockResolvedValue(
      imageRecord({ consent: prior }),
    );
    tx.dailyLogImageConsent.findUnique.mockResolvedValue(prior);
    tx.dailyLogImageConsent.update.mockResolvedValue({
      ...prior,
      consentedAt: new Date('2026-10-22T12:00:00.000Z'),
    });

    await service.grantForClient(
      'image-1',
      CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
      client,
    );
    expect(uploads.createConsentDerivative).not.toHaveBeenCalled();
    expect(tx.dailyLogImageConsent.update).toHaveBeenCalledWith({
      where: { id: 'consent-1' },
      data: expect.objectContaining({
        revokedAt: null,
        publishedUploadId: 'consented-copy-1',
      }),
    });
    expect(tx.dailyLogImageConsentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: DailyLogMediaConsentAction.GRANTED,
      }),
    });
  });

  it.each([
    {
      description: 'image has no before/after classification',
      isBefore: false,
      isAfter: false,
      kind: 'SERVICE',
    },
    {
      description: 'image is linked to a non-service entry',
      isBefore: true,
      isAfter: false,
      kind: 'DEBT_PAYMENT',
    },
  ])(
    'does not resolve a public direct-file route when $description',
    async ({ isBefore, isAfter, kind }) => {
      prisma.dailyLogImageConsent.findUnique.mockResolvedValue({
        id: 'consent-1',
        clientId: 'client-1',
        purpose: 'PUBLIC_GALLERY',
        policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        revokedAt: null,
        dailyLogImage: {
          isBefore,
          isAfter,
          dailyLogEntry: {
            clientId: 'client-1',
            kind,
            status: 'COMPLETED',
            deletedAt: null,
          },
        },
        publishedUpload: {
          id: 'consented-copy-1',
          storageClass: UploadStorageClass.CONSENTED_PUBLIC,
        },
      });

      await expect(
        service.findActivePublicUploadId('consent-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('records revocation and prevents the public direct-file route from resolving', async () => {
    prisma.dailyLogImageConsent.findUnique
      .mockResolvedValueOnce({
        id: 'consent-1',
        clientId: 'client-1',
        purpose: 'PUBLIC_GALLERY',
        policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        revokedAt: null,
        dailyLogImage: { dailyLogEntry: { clientId: 'client-1' } },
      })
      .mockResolvedValueOnce({
        id: 'consent-1',
        clientId: 'client-1',
        purpose: 'PUBLIC_GALLERY',
        policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
        revokedAt: new Date('2026-10-22T12:00:00.000Z'),
        publishedUploadId: 'consented-copy-1',
        dailyLogImage: {
          dailyLogEntry: {
            clientId: 'client-1',
            kind: 'SERVICE',
            status: 'COMPLETED',
            deletedAt: null,
          },
        },
        publishedUpload: {
          id: 'consented-copy-1',
          storageClass: UploadStorageClass.CONSENTED_PUBLIC,
        },
      });
    tx.dailyLogImageConsent.update.mockResolvedValue({});

    const result = await service.revokeForClient('image-1', client);
    expect(result.revoked).toBe(true);
    expect(tx.dailyLogImageConsentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: DailyLogMediaConsentAction.REVOKED,
        actorId: 'client-1',
      }),
    });
    await expect(
      service.findActivePublicUploadId('consent-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
