import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppReleasePlatform, AppReleaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppReleaseDto } from './dto/create-app-release.dto';
import { UpdateAppReleaseDto } from './dto/update-app-release.dto';

const APK_MIMES = new Set([
  'application/vnd.android.package-archive',
  'application/octet-stream',
]);

@Injectable()
export class AppReleasesService {
  private readonly uploadRoot: string;
  private readonly privateUploadRoot: string;
  private readonly publicUploadRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadRoot = path.resolve(
      this.config.get<string>(
        'UPLOAD_ROOT',
        path.join(process.cwd(), 'uploads'),
      ),
    );
    this.privateUploadRoot = path.join(this.uploadRoot, 'private');
    this.publicUploadRoot = path.join(this.uploadRoot, 'public');
  }

  async saveApk(file: Express.Multer.File): Promise<{
    apkPath: string;
    apkSha256: string;
    apkSizeBytes: number;
  }> {
    this.assertApkFile(file);
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const baseName = `app-${randomUUID()}`;
    const relDir = path.join('app-releases', year, month);
    const absDir = path.join(this.privateUploadRoot, relDir);
    await fs.mkdir(this.privateUploadRoot, { recursive: true, mode: 0o700 });
    await fs.chmod(this.privateUploadRoot, 0o700);
    await fs.mkdir(absDir, { recursive: true, mode: 0o700 });
    await fs.chmod(absDir, 0o700);
    const relPath = path
      .join('private', relDir, `${baseName}.apk`)
      .replace(/\\/g, '/');
    const absPath = path.join(this.uploadRoot, relPath);
    await fs.writeFile(absPath, file.buffer, { flag: 'wx', mode: 0o600 });
    const apkSha256 = createHash('sha256').update(file.buffer).digest('hex');
    return {
      apkPath: relPath,
      apkSha256,
      apkSizeBytes: file.buffer.length,
    };
  }

  async create(dto: CreateAppReleaseDto, createdById: string) {
    const release = await this.prisma.appRelease.create({
      data: {
        platform: AppReleasePlatform.ANDROID,
        version: dto.version.trim(),
        versionCode: dto.versionCode,
        minSupportedVersionCode: dto.minSupportedVersionCode,
        forceUpdate: dto.forceUpdate ?? false,
        apkPath: dto.apkPath,
        apkSha256: dto.apkSha256.toLowerCase(),
        apkSizeBytes: dto.apkSizeBytes,
        releaseNotes: dto.releaseNotes?.trim() || null,
        status: AppReleaseStatus.DRAFT,
        createdById,
      },
    });
    if (dto.publish) {
      return this.publish(release.id);
    }
    return release;
  }

  async findAllAdmin() {
    return this.prisma.appRelease.findMany({
      orderBy: [{ versionCode: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(id: string, dto: UpdateAppReleaseDto) {
    const existing = await this.requireById(id);
    if (dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      return this.publish(id, dto);
    }
    return this.prisma.appRelease.update({
      where: { id },
      data: {
        releaseNotes:
          dto.releaseNotes !== undefined
            ? dto.releaseNotes.trim() || null
            : undefined,
        forceUpdate: dto.forceUpdate,
        minSupportedVersionCode: dto.minSupportedVersionCode,
        status: dto.status as AppReleaseStatus | undefined,
        publishedAt:
          dto.status === 'RETIRED' ? existing.publishedAt : undefined,
      },
    });
  }

  async publish(id: string, patch?: UpdateAppReleaseDto) {
    const existing = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Release nije pronađen.');

    let publicApkPath = existing.apkPath;
    let copiedPublicPath: string | null = null;
    if (existing.apkPath.startsWith('private/')) {
      const sourcePath = this.resolveWithinPrivateRoot(existing.apkPath);
      let buffer: Buffer;
      try {
        buffer = await fs.readFile(sourcePath);
      } catch {
        throw new NotFoundException('Privatni APK fajl nije pronađen.');
      }
      if (
        buffer.length < 4 ||
        !buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
      ) {
        throw new BadRequestException('Privatna datoteka nije validan APK.');
      }
      const checksum = createHash('sha256').update(buffer).digest('hex');
      if (
        checksum !== existing.apkSha256 ||
        buffer.length !== existing.apkSizeBytes
      ) {
        throw new BadRequestException(
          'Kontrolni zbir privatnog APK fajla nije ispravan.',
        );
      }

      const now = new Date();
      const year = now.getFullYear().toString();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const relDir = path.join('app-releases', year, month);
      const fileName = `release-${randomUUID()}.apk`;
      publicApkPath = path.join(relDir, fileName).replace(/\\/g, '/');
      const publicDir = path.join(this.publicUploadRoot, relDir);
      await fs.mkdir(publicDir, { recursive: true, mode: 0o755 });
      await fs.chmod(publicDir, 0o755);
      const destination = this.resolveWithinPublicRoot(publicApkPath);
      await fs.writeFile(destination, buffer, { flag: 'wx', mode: 0o644 });
      copiedPublicPath = destination;
      try {
        await fs.chmod(destination, 0o644);
      } catch (error) {
        await fs.unlink(destination).catch(() => undefined);
        copiedPublicPath = null;
        throw error;
      }
    } else {
      const existingPublicPath = this.resolveWithinPublicRoot(existing.apkPath);
      let buffer: Buffer;
      try {
        buffer = await fs.readFile(existingPublicPath);
      } catch {
        throw new NotFoundException('Javni APK fajl nije pronađen.');
      }
      if (
        buffer.length < 4 ||
        !buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
      ) {
        throw new BadRequestException('Javna datoteka nije validan APK.');
      }
      const checksum = createHash('sha256').update(buffer).digest('hex');
      if (
        checksum !== existing.apkSha256 ||
        buffer.length !== existing.apkSizeBytes
      ) {
        throw new BadRequestException(
          'Kontrolni zbir javnog APK fajla nije ispravan.',
        );
      }
      await fs.chmod(path.dirname(existingPublicPath), 0o755);
      await fs.chmod(existingPublicPath, 0o644);
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const current = await tx.appRelease.findUnique({ where: { id } });
        if (!current) throw new NotFoundException('Release nije pronađen.');
        if (current.apkPath !== existing.apkPath) {
          throw new ConflictException(
            'APK putanja je promijenjena tokom objave.',
          );
        }
        await tx.appRelease.updateMany({
          where: {
            platform: current.platform,
            status: AppReleaseStatus.PUBLISHED,
            id: { not: id },
          },
          data: { status: AppReleaseStatus.RETIRED },
        });
        return tx.appRelease.update({
          where: { id },
          data: {
            status: AppReleaseStatus.PUBLISHED,
            apkPath: publicApkPath,
            publishedAt: current.publishedAt ?? new Date(),
            releaseNotes:
              patch?.releaseNotes !== undefined
                ? patch.releaseNotes.trim() || null
                : undefined,
            forceUpdate: patch?.forceUpdate,
            minSupportedVersionCode: patch?.minSupportedVersionCode,
          },
        });
      });
    } catch (error) {
      if (copiedPublicPath) {
        await fs.unlink(copiedPublicPath).catch(() => undefined);
      }
      throw error;
    }
  }

  async findLatestAndroidPublic() {
    const latest = await this.prisma.appRelease.findFirst({
      where: {
        platform: AppReleasePlatform.ANDROID,
        status: AppReleaseStatus.PUBLISHED,
      },
      orderBy: { versionCode: 'desc' },
    });
    if (!latest) return null;
    return {
      version: latest.version,
      versionCode: latest.versionCode,
      minSupportedVersionCode: latest.minSupportedVersionCode,
      forceUpdate: latest.forceUpdate,
      apkUrl: `/uploads/${latest.apkPath}`,
      apkSha256: latest.apkSha256,
      apkSizeBytes: latest.apkSizeBytes,
      releaseNotes: latest.releaseNotes,
      publishedAt: latest.publishedAt?.toISOString() ?? null,
    };
  }

  private resolveWithinPrivateRoot(relativePath: string): string {
    const normalized = String(relativePath ?? '').replace(/\\/g, '/');
    if (!normalized.startsWith('private/')) {
      throw new BadRequestException('Privatna APK putanja nije validna.');
    }
    return this.resolveWithin(
      this.privateUploadRoot,
      normalized.slice('private/'.length),
    );
  }

  private resolveWithinPublicRoot(relativePath: string): string {
    if (relativePath.startsWith('private/')) {
      throw new BadRequestException('Javna APK putanja nije validna.');
    }
    return this.resolveWithin(this.publicUploadRoot, relativePath);
  }

  private resolveWithin(root: string, relativePath: string): string {
    const normalized = String(relativePath ?? '').replace(/\\/g, '/');
    const absolutePath = path.resolve(root, normalized);
    if (
      !normalized ||
      absolutePath === root ||
      !absolutePath.startsWith(`${root}${path.sep}`)
    ) {
      throw new BadRequestException('APK putanja nije validna.');
    }
    return absolutePath;
  }

  private async requireById(id: string) {
    const row = await this.prisma.appRelease.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Release nije pronađen.');
    return row;
  }

  private assertApkFile(file: Express.Multer.File): void {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Nijedna datoteka nije poslata.');
    }
    const name = (file.originalname || '').toLowerCase();
    const zipSignature = file.buffer
      .subarray(0, 4)
      .equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (
      !name.endsWith('.apk') ||
      !APK_MIMES.has(file.mimetype) ||
      !zipSignature
    ) {
      throw new BadRequestException('Dozvoljen je samo validan APK fajl.');
    }
  }
}
