import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  BadRequestException,
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadRoot = this.config.get<string>(
      'UPLOAD_ROOT',
      '/usr/app/uploads',
    );
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
    const baseName = `app-${Date.now()}`;
    const relDir = path.join('app-releases', year, month);
    const absDir = path.join(this.uploadRoot, relDir);
    await fs.mkdir(absDir, { recursive: true });
    const relPath = path.join(relDir, `${baseName}.apk`).replace(/\\/g, '/');
    const absPath = path.join(this.uploadRoot, relPath);
    await fs.writeFile(absPath, file.buffer);
    const apkSha256 = createHash('sha256').update(file.buffer).digest('hex');
    return {
      apkPath: relPath,
      apkSha256,
      apkSizeBytes: file.size,
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
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.appRelease.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Release nije pronađen.');
      }
      await tx.appRelease.updateMany({
        where: {
          platform: existing.platform,
          status: AppReleaseStatus.PUBLISHED,
          id: { not: id },
        },
        data: { status: AppReleaseStatus.RETIRED },
      });
      return tx.appRelease.update({
        where: { id },
        data: {
          status: AppReleaseStatus.PUBLISHED,
          publishedAt: existing.publishedAt ?? new Date(),
          releaseNotes:
            patch?.releaseNotes !== undefined
              ? patch.releaseNotes.trim() || null
              : undefined,
          forceUpdate: patch?.forceUpdate,
          minSupportedVersionCode: patch?.minSupportedVersionCode,
        },
      });
    });
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
    if (!name.endsWith('.apk') || !APK_MIMES.has(file.mimetype)) {
      throw new BadRequestException('Dozvoljen je samo APK fajl.');
    }
  }
}

