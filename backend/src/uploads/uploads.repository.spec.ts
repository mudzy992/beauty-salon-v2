import type { PrismaService } from '../prisma/prisma.service';
import { UploadsRepository } from './uploads.repository';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('UploadsRepository', () => {
  const createCount = () => jest.fn().mockResolvedValue(0);
  let prisma: Record<string, { count: jest.Mock }>;
  let repository: UploadsRepository;

  beforeEach(() => {
    prisma = {
      dailyLogImage: { count: createCount() },
      expenseAttachment: { count: createCount() },
      galleryImage: { count: createCount() },
      expense: { count: createCount() },
      user: { count: createCount() },
      salonSettings: { count: createCount() },
      service: { count: createCount() },
      blogPost: { count: createCount() },
      appSetting: { count: createCount() },
      appRelease: { count: createCount() },
      upload: { count: createCount() },
    };
    repository = new UploadsRepository(prisma as unknown as PrismaService);
  });

  it('returns false when no known record references the upload paths', async () => {
    await expect(
      repository.hasReferences('upload-1', [
        'avatars/2026/10/profile-thumb.webp',
      ]),
    ).resolves.toBe(false);

    expect(prisma.dailyLogImage.count).toHaveBeenCalledWith({
      where: { uploadId: 'upload-1' },
    });
    expect(prisma.expenseAttachment.count).toHaveBeenCalledWith({
      where: { uploadId: 'upload-1' },
    });
    expect(prisma.galleryImage.count).toHaveBeenCalledWith({
      where: { uploadId: 'upload-1' },
    });
    expect(prisma.expense.count).toHaveBeenCalledWith({
      where: { invoiceUploadId: 'upload-1' },
    });
    expect(prisma.blogPost.count).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          {
            heroImage: {
              in: expect.arrayContaining([
                'avatars/2026/10/profile-thumb.webp',
              ]),
            },
          },
          {
            ogImage: {
              in: expect.arrayContaining([
                'avatars/2026/10/profile-thumb.webp',
              ]),
            },
          },
          { heroImage: { contains: 'avatars/2026/10/profile-thumb.webp' } },
          { ogImage: { contains: 'avatars/2026/10/profile-thumb.webp' } },
          { content: { contains: 'avatars/2026/10/profile-thumb.webp' } },
        ]),
      },
    });
  });

  it('returns true when a relational attachment references the upload', async () => {
    prisma.galleryImage.count.mockResolvedValue(1);

    await expect(
      repository.hasReferences('upload-2', [
        'services/2026/10/service-original.png',
      ]),
    ).resolves.toBe(true);
  });

  it('checks known path columns using relative and public /uploads forms', async () => {
    const pathOriginal = 'avatars/2026/10/profile-thumb.webp';

    await repository.hasReferences('upload-3', [pathOriginal]);

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        OR: expect.arrayContaining([
          {
            avatar: {
              in: expect.arrayContaining([
                pathOriginal,
                `/${pathOriginal}`,
                `uploads/${pathOriginal}`,
                `/uploads/${pathOriginal}`,
              ]),
            },
          },
          { avatar: { contains: pathOriginal } },
        ]),
      },
    });
    expect(prisma.upload.count).toHaveBeenCalledWith({
      where: {
        id: { not: 'upload-3' },
        OR: [
          { pathOriginal: { in: expect.any(Array) } },
          { pathThumb: { in: expect.any(Array) } },
          { pathSmall: { in: expect.any(Array) } },
          { pathMedium: { in: expect.any(Array) } },
        ],
      },
    });
  });
});
