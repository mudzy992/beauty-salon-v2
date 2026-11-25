import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadStorageClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { DailyLogPublicService } from './daily-log-public.service';
import { WorkGalleryUploadService } from './work-gallery-upload.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const tx = {
  $queryRaw: jest.fn().mockResolvedValue([]),
  dailyLogEntry: { findFirst: jest.fn() },
  dailyLogImage: { count: jest.fn(), create: jest.fn() },
};
const prisma = {
  service: { findUnique: jest.fn() },
  dailyLogEntry: { findFirst: jest.fn(), findMany: jest.fn() },
  dailyLogImage: { count: jest.fn() },
  $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
};
const uploads = {
  saveWorkGalleryPhoto: jest.fn(),
  deleteUnreferencedUpload: jest.fn(),
};
const feed = {
  consentedEntryIds: jest.fn().mockResolvedValue([]),
};

const serviceId = 'service-1';
const entryId = 'entry-1';

function photo(name: string) {
  return {
    originalname: name,
    mimetype: 'image/jpeg',
    buffer: Buffer.from('photo'),
    size: 5,
  } as unknown as Express.Multer.File;
}

function eligibleEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: entryId,
    completedAt: new Date('2026-01-01T12:00:00Z'),
    date: new Date('2026-01-01T00:00:00Z'),
    publicReferenceCode: 'REF-1',
    client: { firstName: 'Amir', lastName: 'B.' },
    ...overrides,
  };
}

describe('WorkGalleryUploadService', () => {
  let service: WorkGalleryUploadService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.service.findUnique.mockResolvedValue({ id: serviceId });
    prisma.dailyLogEntry.findFirst.mockResolvedValue({ id: entryId });
    prisma.dailyLogImage.count.mockResolvedValue(0);
    tx.dailyLogEntry.findFirst.mockResolvedValue({ id: entryId });
    tx.dailyLogImage.count.mockResolvedValue(0);
    tx.dailyLogImage.create
      .mockResolvedValueOnce({ id: 'image-before' })
      .mockResolvedValueOnce({ id: 'image-after' });
    uploads.saveWorkGalleryPhoto
      .mockResolvedValueOnce({ id: 'upload-before', pathOriginal: 'private/work-gallery/before.jpg' })
      .mockResolvedValueOnce({ id: 'upload-after', pathOriginal: 'private/work-gallery/after.jpg' });
    uploads.deleteUnreferencedUpload.mockResolvedValue(undefined);
    feed.consentedEntryIds.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkGalleryUploadService,
        { provide: PrismaService, useValue: prisma },
        { provide: UploadsService, useValue: uploads },
        { provide: DailyLogPublicService, useValue: feed },
      ],
    }).compile();
    service = module.get(WorkGalleryUploadService);
  });

  describe('listEligibleEntries', () => {
    it('returns records without an existing pair and identifies the visit', async () => {
      prisma.dailyLogEntry.findMany.mockResolvedValue([eligibleEntry()]);

      const page = await service.listEligibleEntries(serviceId, 0, 20);

      expect(page).toEqual({
        items: [
          {
            id: entryId,
            completedAt: '2026-01-01T12:00:00.000Z',
            date: '2026-01-01',
            reference: 'REF-1',
            clientName: 'Amir B.',
          },
        ],
        hasMore: false,
        nextOffset: 1,
      });
      expect(prisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            serviceId,
            kind: 'SERVICE',
            status: 'COMPLETED',
            deletedAt: null,
            clientId: { not: null },
            workGalleryHidden: false,
            images: { none: { OR: [{ isBefore: true }, { isAfter: true }] } },
          }),
        }),
      );
    });

    it('does not leak client fields other than the display name', async () => {
      prisma.dailyLogEntry.findMany.mockResolvedValue([eligibleEntry()]);

      const page = await service.listEligibleEntries(serviceId, 0, 20);

      expect(Object.keys(page.items[0]).sort()).toEqual([
        'clientName',
        'completedAt',
        'date',
        'id',
        'reference',
      ]);
    });

    it('reports a missing service and paginates deterministically', async () => {
      prisma.service.findUnique.mockResolvedValue(null);
      await expect(service.listEligibleEntries(serviceId, 0, 20)).rejects.toBeInstanceOf(NotFoundException);

      prisma.service.findUnique.mockResolvedValue({ id: serviceId });
      prisma.dailyLogEntry.findMany.mockResolvedValue([eligibleEntry(), eligibleEntry({ id: 'entry-2' })]);
      const page = await service.listEligibleEntries(serviceId, 20, 1);
      expect(page.hasMore).toBe(true);
      expect(page.nextOffset).toBe(21);
    });
  });

  describe('createPair', () => {
    it('writes two private uploads and binds them in one transaction', async () => {
      const result = await service.createPair(serviceId, entryId, photo('before.jpg'), photo('after.jpg'), 'owner-1');

      expect(result).toEqual({
        entryId,
        beforeImageId: 'image-before',
        afterImageId: 'image-after',
        storageClass: UploadStorageClass.PRIVATE,
        consentRequired: true,
      });
      expect(uploads.saveWorkGalleryPhoto).toHaveBeenCalledTimes(2);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(tx.dailyLogImage.create).toHaveBeenCalledTimes(2);
      expect(tx.dailyLogImage.create.mock.calls[0][0].data).toMatchObject({
        dailyLogEntryId: entryId,
        uploadId: 'upload-before',
        isBefore: true,
        isAfter: false,
      });
      expect(tx.dailyLogImage.create.mock.calls[1][0].data).toMatchObject({
        dailyLogEntryId: entryId,
        uploadId: 'upload-after',
        isBefore: false,
        isAfter: true,
      });
      expect(uploads.deleteUnreferencedUpload).not.toHaveBeenCalled();
    });

    it('never creates consent for the client', async () => {
      await service.createPair(serviceId, entryId, photo('before.jpg'), photo('after.jpg'), 'owner-1');

      expect(prisma.dailyLogImageConsent).toBeUndefined();
      expect(Object.keys(prisma)).not.toContain('dailyLogImageConsent');
    });

    it('refuses a record that is not eligible', async () => {
      prisma.dailyLogEntry.findFirst.mockResolvedValue(null);

      await expect(service.createPair(serviceId, entryId, photo('b.jpg'), photo('a.jpg'), 'owner-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(uploads.saveWorkGalleryPhoto).not.toHaveBeenCalled();
    });

    it('refuses a record that already has a pair and writes nothing', async () => {
      prisma.dailyLogImage.count.mockResolvedValue(1);

      await expect(service.createPair(serviceId, entryId, photo('b.jpg'), photo('a.jpg'), 'owner-1')).rejects.toBeInstanceOf(ConflictException);
      expect(uploads.saveWorkGalleryPhoto).not.toHaveBeenCalled();
      expect(tx.dailyLogImage.create).not.toHaveBeenCalled();
    });

    it('removes both private uploads when the binding fails', async () => {
      tx.dailyLogImage.count.mockResolvedValue(1);

      await expect(service.createPair(serviceId, entryId, photo('b.jpg'), photo('a.jpg'), 'owner-1')).rejects.toBeInstanceOf(ConflictException);
      expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('upload-before');
      expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('upload-after');
      expect(tx.dailyLogImage.create).not.toHaveBeenCalled();
    });

    it('removes the first upload when the second one is rejected', async () => {
      uploads.saveWorkGalleryPhoto
        .mockReset()
        .mockResolvedValueOnce({ id: 'upload-before', pathOriginal: 'private/work-gallery/before.jpg' })
        .mockRejectedValueOnce(new BadRequestException('Sadržaj datoteke nije validna fotografija.'));

      await expect(service.createPair(serviceId, entryId, photo('b.jpg'), photo('a.svg'), 'owner-1')).rejects.toBeInstanceOf(BadRequestException);
      expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledTimes(1);
      expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledWith('upload-before');
      expect(tx.dailyLogImage.create).not.toHaveBeenCalled();
    });

    it('keeps the private upload when the cleanup itself fails', async () => {
      tx.dailyLogImage.count.mockResolvedValue(1);
      uploads.deleteUnreferencedUpload.mockRejectedValue(new Error('disk error'));

      await expect(service.createPair(serviceId, entryId, photo('b.jpg'), photo('a.jpg'), 'owner-1')).rejects.toBeInstanceOf(ConflictException);
      expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledTimes(2);
    });

    it('re-checks eligibility inside the transaction so a concurrent pair wins once', async () => {
      tx.dailyLogEntry.findFirst.mockResolvedValue(null);

      await expect(service.createPair(serviceId, entryId, photo('b.jpg'), photo('a.jpg'), 'owner-1')).rejects.toBeInstanceOf(ConflictException);
      expect(tx.dailyLogImage.create).not.toHaveBeenCalled();
      expect(uploads.deleteUnreferencedUpload).toHaveBeenCalledTimes(2);
    });
  });

  describe('listPendingConsent', () => {
    it('lists private pairs that are not part of the consented feed', async () => {
      prisma.dailyLogEntry.findMany.mockResolvedValue([
        {
          ...eligibleEntry(),
          images: [
            {
              id: 'image-before',
              isBefore: true,
              isAfter: false,
              upload: { storageClass: UploadStorageClass.PRIVATE, mimeType: 'image/jpeg' },
              consent: null,
            },
            {
              id: 'image-after',
              isBefore: false,
              isAfter: true,
              upload: { storageClass: UploadStorageClass.PRIVATE, mimeType: 'image/jpeg' },
              consent: {
                clientId: 'client-1',
                revokedAt: null,
                policyVersion: 'client-media-publication-v1',
                purpose: 'PUBLIC_GALLERY',
                publishedUploadId: 'derivative-1',
              },
            },
          ],
        },
      ]);

      const page = await service.listPendingConsent(serviceId, 0, 20);

      expect(page.items).toHaveLength(1);
      expect(page.items[0].images).toEqual([
        { id: 'image-before', role: 'before', private: true, consented: false },
        { id: 'image-after', role: 'after', private: true, consented: true },
      ]);
      expect(JSON.stringify(page)).not.toContain('pathOriginal');
      expect(feed.consentedEntryIds).toHaveBeenCalledWith(prisma, serviceId, [entryId]);
    });

    it('drops records that already appear in the consented feed', async () => {
      prisma.dailyLogEntry.findMany.mockResolvedValue([
        { ...eligibleEntry(), images: [] },
      ]);
      feed.consentedEntryIds.mockResolvedValue([entryId]);

      const page = await service.listPendingConsent(serviceId, 0, 20);

      expect(page.items).toEqual([]);
    });
  });

  describe('assertBothPhotos', () => {
    it('requires both photos', () => {
      expect(() => service.assertBothPhotos(undefined, photo('a.jpg'))).toThrow(BadRequestException);
      expect(() => service.assertBothPhotos(photo('a.jpg'), undefined)).toThrow(BadRequestException);
      expect(() => service.assertBothPhotos(photo('a.jpg'), photo('b.jpg'))).not.toThrow();
    });
  });
});
