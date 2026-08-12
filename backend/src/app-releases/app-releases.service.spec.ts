import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppReleasePlatform, AppReleaseStatus } from '@prisma/client';
import { AppReleasesService } from './app-releases.service';

describe('AppReleasesService', () => {
  const uploadRoot = '/tmp/app-releases-test';
  let prisma: {
    appRelease: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: AppReleasesService;

  beforeEach(() => {
    prisma = {
      appRelease: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    const config = { get: jest.fn(() => uploadRoot) };
    service = new AppReleasesService(prisma as never, config as never);
  });

  it('rejects non-apk upload', async () => {
    const file = {
      buffer: Buffer.from('x'),
      size: 1,
      originalname: 'note.txt',
      mimetype: 'text/plain',
    } as Express.Multer.File;
    await expect(service.saveApk(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns null-shaped 404 path when no published release', async () => {
    prisma.appRelease.findFirst.mockResolvedValue(null);
    await expect(service.findLatestAndroidPublic()).resolves.toBeNull();
  });

  it('maps latest published release to public DTO', async () => {
    prisma.appRelease.findFirst.mockResolvedValue({
      version: '1.0.1',
      versionCode: 2,
      minSupportedVersionCode: 1,
      forceUpdate: false,
      apkPath: 'app-releases/2026/08/app.apk',
      apkSha256: 'abc',
      apkSizeBytes: 10,
      releaseNotes: 'fix',
      publishedAt: new Date('2026-08-12T12:00:00.000Z'),
    });
    await expect(service.findLatestAndroidPublic()).resolves.toEqual({
      version: '1.0.1',
      versionCode: 2,
      minSupportedVersionCode: 1,
      forceUpdate: false,
      apkUrl: '/uploads/app-releases/2026/08/app.apk',
      apkSha256: 'abc',
      apkSizeBytes: 10,
      releaseNotes: 'fix',
      publishedAt: '2026-08-12T12:00:00.000Z',
    });
  });

  it('publish retires previous published releases', async () => {
    prisma.appRelease.findUnique.mockResolvedValue({
      id: 'r2',
      platform: AppReleasePlatform.ANDROID,
      status: AppReleaseStatus.DRAFT,
      publishedAt: null,
    });
    prisma.appRelease.updateMany.mockResolvedValue({ count: 1 });
    prisma.appRelease.update.mockResolvedValue({
      id: 'r2',
      status: AppReleaseStatus.PUBLISHED,
    });
    await service.publish('r2');
    expect(prisma.appRelease.updateMany).toHaveBeenCalledWith({
      where: {
        platform: AppReleasePlatform.ANDROID,
        status: AppReleaseStatus.PUBLISHED,
        id: { not: 'r2' },
      },
      data: { status: AppReleaseStatus.RETIRED },
    });
  });

  it('update throws when release missing', async () => {
    prisma.appRelease.findUnique.mockResolvedValue(null);
    await expect(
      service.update('missing', { forceUpdate: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
