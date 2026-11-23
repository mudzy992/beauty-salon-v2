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
  $queryRaw: jest.fn().mockResolvedValue([]),
  dailyLogImage: { findUnique: jest.fn() },
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
    dailyLogEntryId: 'entry-1',
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
    tx.dailyLogImage.findUnique.mockImplementation(() => prisma.dailyLogImage.findUnique());
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

  it('marks only the two selected active photos as auto-published, not pending or extra photos', async () => {
    const pending = consentedListImage('pending-image', true, false);
    pending.consent = null as never;
    prisma.dailyLogImage.findMany.mockResolvedValue([
      consentedListImage('before-image', true, false),
      consentedListImage('extra-before-image', true, false),
      consentedListImage('after-image', false, true),
      pending,
    ]);
    prisma.galleryCategory.findFirst.mockResolvedValue({ id: 'auto-category', name: 'Rezultati' });
    const result = await service.listForClient(client);
    expect(result.active.map(image => [image.imageId, image.isPublished])).toEqual([
      ['before-image', true], ['extra-before-image', false], ['after-image', true],
    ]);
    expect(result.pending[0]).toMatchObject({ imageId: 'pending-image', isPublished: false, publishedCategories: [] });
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
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Private description' }));
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
        approvedDescription: null,
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

  it('publishes a description only after a separate opt-in to the reviewed text', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Kratka kovrdžava kosa' }));
    uploads.createConsentDerivative.mockResolvedValue({ id: 'copy-1' });
    tx.dailyLogImageConsent.findUnique.mockResolvedValue(null);
    tx.dailyLogImageConsent.create.mockResolvedValue({ id: 'consent-1', consentedAt: new Date() });
    tx.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Kratka kovrdžava kosa' }));
    await service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client, true, 'Kratka kovrdžava kosa');
    expect(tx.dailyLogImageConsent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ approvedDescription: 'Kratka kovrdžava kosa' }) }));
  });

  it('does not pretend an existing photo-only consent approved a description', async () => {
    const active = { id: 'consent-1', clientId: 'client-1', revokedAt: null, policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, publishedUploadId: 'copy-1', approvedDescription: null, consentedAt: new Date() };
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Opis', consent: active }));
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client, true, 'Opis')).rejects.toBeInstanceOf(ConflictException);
    expect(uploads.createConsentDerivative).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous compatible grants and cleans the losing derivative', async () => {
    const active = { id: 'consent-1', clientId: 'client-1', revokedAt: null, policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, publishedUploadId: 'first-copy', approvedDescription: null, consentedAt: new Date() };
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord());
    uploads.createConsentDerivative.mockResolvedValue({ id: 'second-copy' });
    uploads.deleteUnreferencedUpload.mockResolvedValue(undefined);
    tx.dailyLogImageConsent.findUnique.mockResolvedValue(active);
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client)).resolves.toEqual({ active: true, consentedAt: active.consentedAt.toISOString() });
    expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('second-copy');
    expect(tx.dailyLogImageConsentEvent.create).not.toHaveBeenCalled();
  });

  it('rejects concurrent grants with different description decisions', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Opis' }));
    uploads.createConsentDerivative.mockResolvedValue({ id: 'second-copy' });
    uploads.deleteUnreferencedUpload.mockResolvedValue(undefined);
    tx.dailyLogImageConsent.findUnique.mockResolvedValue({ id: 'consent-1', clientId: 'client-1', revokedAt: null, policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, publishedUploadId: 'first-copy', approvedDescription: 'Opis', consentedAt: new Date() });
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client, false)).rejects.toBeInstanceOf(ConflictException);
    expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('second-copy');
    expect(tx.dailyLogImageConsent.update).not.toHaveBeenCalled();
  });

  it('rejects a stale grant if consent was revoked during preparation', async () => {
    const revoked = { id: 'consent-1', clientId: 'client-1', revokedAt: new Date(), policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, publishedUploadId: 'first-copy', consentedAt: new Date() };
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord());
    uploads.createConsentDerivative.mockResolvedValue({ id: 'second-copy' });
    uploads.deleteUnreferencedUpload.mockResolvedValue(undefined);
    tx.dailyLogImageConsent.findUnique.mockResolvedValue(revoked);
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client)).rejects.toBeInstanceOf(ConflictException);
    expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('second-copy');
    expect(tx.dailyLogImageConsent.update).not.toHaveBeenCalled();
  });

  it('rejects a stale description before creating a public derivative', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Drugačiji opis' }));
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client, true, 'Stari opis')).rejects.toMatchObject({
      response: {
        code: 'MEDIA_CONSENT_REVIEWED_DESCRIPTION_STALE',
        message: 'Opis se promijenio ili nije dostupan. Osvježite podatke i ponovo pregledajte opis.',
      },
      status: 409,
    });
    expect(uploads.createConsentDerivative).not.toHaveBeenCalled();
    expect(tx.dailyLogImageConsent.create).not.toHaveBeenCalled();
  });

  it('rolls back and cleans the derivative if the description changes during grant', async () => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Prvobitni opis' }));
    uploads.createConsentDerivative.mockResolvedValue({ id: 'copy-1' });
    uploads.deleteUnreferencedUpload.mockResolvedValue(undefined);
    tx.dailyLogImage.findUnique.mockResolvedValue(imageRecord({ description: 'Novi opis' }));
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client, true, 'Prvobitni opis')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.dailyLogImageConsent.create).not.toHaveBeenCalled();
    expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('copy-1');
  });

  it.each([
    { label: 'client changed', changes: { dailyLogEntry: { clientId: 'client-2', kind: 'SERVICE', status: 'COMPLETED', deletedAt: null } } },
    { label: 'entry no longer completed', changes: { dailyLogEntry: { clientId: 'client-1', kind: 'SERVICE', status: 'PENDING', deletedAt: null } } },
    { label: 'entry deleted', changes: { dailyLogEntry: { clientId: 'client-1', kind: 'SERVICE', status: 'COMPLETED', deletedAt: new Date() } } },
    { label: 'image reclassified', changes: { isBefore: false, isAfter: false } },
    { label: 'image moved', changes: { dailyLogEntryId: 'another-entry' } },
    { label: 'original replaced', changes: { uploadId: 'another-upload' } },
    { label: 'original no longer private', changes: { upload: { storageClass: UploadStorageClass.PUBLIC } } },
  ])('rechecks eligibility after derivative preparation: $label', async ({ changes }) => {
    prisma.dailyLogImage.findUnique.mockResolvedValue(imageRecord());
    tx.dailyLogImage.findUnique.mockResolvedValue(imageRecord(changes));
    uploads.createConsentDerivative.mockResolvedValue({ id: 'copy-to-clean' });
    uploads.deleteUnreferencedUpload.mockResolvedValue(undefined);
    await expect(service.grantForClient('image-1', CLIENT_MEDIA_PUBLICATION_POLICY_VERSION, client)).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.dailyLogImageConsent.create).not.toHaveBeenCalled();
    expect(tx.dailyLogImageConsentEvent.create).not.toHaveBeenCalled();
    expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('copy-to-clean');
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
    tx.dailyLogImageConsent.findUnique.mockResolvedValueOnce({
      id: 'consent-1',
      clientId: 'client-1',
      purpose: 'PUBLIC_GALLERY',
      policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
      revokedAt: null,
      dailyLogImage: { dailyLogEntry: { clientId: 'client-1' } },
    });
    prisma.dailyLogImageConsent.findUnique.mockResolvedValueOnce({
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
