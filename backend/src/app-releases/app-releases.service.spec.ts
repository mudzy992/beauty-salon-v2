import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AppReleasePlatform, AppReleaseStatus } from '@prisma/client';
import { AppReleasesService } from './app-releases.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

jest.mock('fs/promises');

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
    jest.clearAllMocks();
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.chmod as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    );
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

  it('rejects an apk extension and MIME type with a non-zip body', async () => {
    const file = {
      buffer: Buffer.from('not an apk'),
      size: 10,
      originalname: 'release.apk',
      mimetype: 'application/vnd.android.package-archive',
    } as Express.Multer.File;
    await expect(service.saveApk(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('keeps uploaded draft APKs private until publication and checks the ZIP signature', async () => {
    const buffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const result = await service.saveApk({
      buffer,
      size: buffer.length,
      originalname: 'release.apk',
      mimetype: 'application/vnd.android.package-archive',
    } as Express.Multer.File);

    expect(result.apkPath).toMatch(
      /^private\/app-releases\/\d{4}\/\d{2}\/app-.+\.apk$/,
    );
    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(path.join('private', 'app-releases')),
      expect.objectContaining({ recursive: true, mode: 0o700 }),
    );
    expect(fs.chmod).toHaveBeenCalledWith(
      expect.stringContaining(path.join('private', 'app-releases')),
      0o700,
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('private', 'app-releases')),
      buffer,
      { flag: 'wx', mode: 0o600 },
    );
    expect(result.apkSha256).toHaveLength(64);
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

  it('copies and verifies a private draft APK before publishing its public path', async () => {
    const apkBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x01]);
    const apkSha256 = createHash('sha256').update(apkBuffer).digest('hex');
    (fs.readFile as jest.Mock).mockResolvedValue(apkBuffer);
    prisma.appRelease.findUnique.mockResolvedValue({
      id: 'draft-1',
      platform: AppReleasePlatform.ANDROID,
      status: AppReleaseStatus.DRAFT,
      apkPath: 'private/app-releases/2026/10/draft-1.apk',
      apkSha256,
      apkSizeBytes: apkBuffer.length,
      publishedAt: null,
    });
    prisma.appRelease.updateMany.mockResolvedValue({ count: 0 });
    prisma.appRelease.update.mockResolvedValue({
      id: 'draft-1',
      status: AppReleaseStatus.PUBLISHED,
    });

    await service.publish('draft-1');

    expect(fs.readFile).toHaveBeenCalledWith(
      path.join(
        uploadRoot,
        'private',
        'app-releases',
        '2026',
        '10',
        'draft-1.apk',
      ),
    );
    expect(fs.mkdir).toHaveBeenCalledWith(
      expect.stringContaining(path.join('public', 'app-releases')),
      { recursive: true, mode: 0o755 },
    );
    expect(fs.chmod).toHaveBeenCalledWith(
      expect.stringContaining(path.join('public', 'app-releases')),
      0o755,
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(path.join('public', 'app-releases')),
      apkBuffer,
      { flag: 'wx', mode: 0o644 },
    );
    expect(fs.chmod).toHaveBeenCalledWith(
      expect.stringContaining(path.join('public', 'app-releases')),
      0o644,
    );
    expect(prisma.appRelease.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'draft-1' },
        data: expect.objectContaining({
          status: AppReleaseStatus.PUBLISHED,
          apkPath: expect.stringMatching(
            /^app-releases\/\d{4}\/\d{2}\/release-.+\.apk$/,
          ),
        }),
      }),
    );
    expect(
      (fs.writeFile as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0]);
  });

  it('rejects a draft path traversal before reading or publishing a file', async () => {
    const apkBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    prisma.appRelease.findUnique.mockResolvedValue({
      id: 'draft-escape',
      platform: AppReleasePlatform.ANDROID,
      status: AppReleaseStatus.DRAFT,
      apkPath: 'private/../../outside.apk',
      apkSha256: createHash('sha256').update(apkBuffer).digest('hex'),
      apkSizeBytes: apkBuffer.length,
      publishedAt: null,
    });

    await expect(service.publish('draft-escape')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a draft whose private APK checksum no longer matches its record', async () => {
    const apkBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    (fs.readFile as jest.Mock).mockResolvedValue(apkBuffer);
    prisma.appRelease.findUnique.mockResolvedValue({
      id: 'draft-corrupt',
      platform: AppReleasePlatform.ANDROID,
      status: AppReleaseStatus.DRAFT,
      apkPath: 'private/app-releases/2026/10/draft-corrupt.apk',
      apkSha256: '0'.repeat(64),
      apkSizeBytes: apkBuffer.length,
      publishedAt: null,
    });

    await expect(service.publish('draft-corrupt')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('publish retires previous published releases', async () => {
    const apkBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    (fs.readFile as jest.Mock).mockResolvedValue(apkBuffer);
    prisma.appRelease.findUnique.mockResolvedValue({
      id: 'r2',
      platform: AppReleasePlatform.ANDROID,
      status: AppReleaseStatus.DRAFT,
      apkPath: 'app-releases/2026/10/r2.apk',
      apkSha256: createHash('sha256').update(apkBuffer).digest('hex'),
      apkSizeBytes: apkBuffer.length,
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
