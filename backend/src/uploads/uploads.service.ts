import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

const IMAGE_SIZES = {
  thumb: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
} as const;

const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

@Injectable()
export class UploadsService {
  private readonly uploadRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.uploadRoot = this.config.get<string>('UPLOAD_ROOT', '/usr/app/uploads');
  }

  async saveFile(
    file: Express.Multer.File,
    entity: string,
    uploadedById?: string,
  ): Promise<{ id: string; pathOriginal: string; pathThumb?: string; pathSmall?: string; pathMedium?: string }> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const ext = path.extname(file.originalname) || '.bin';
    const baseName = `${path.basename(file.originalname, ext)}-${Date.now()}`;

    // Pod uploads root: opći uploadi u 2026/03, daily-log u daily-log/2026/03 (u bazi bez "uploads/" prefiksa)
    const relDir =
      entity === 'uploads'
        ? path.join(year, month)
        : path.join(entity, year, month);
    const absDir = path.join(this.uploadRoot, relDir);
    await fs.mkdir(absDir, { recursive: true });

    const isImage = IMAGE_MIMES.has(file.mimetype);
    const isDoc = DOC_MIMES.has(file.mimetype);
    if (!isImage && !isDoc) {
      throw new BadRequestException('Tip datoteke nije dozvoljen.');
    }

    const paths: { pathOriginal: string; pathThumb?: string; pathSmall?: string; pathMedium?: string } = {
      pathOriginal: path.join(relDir, `${baseName}-original${ext}`).replace(/\\/g, '/'),
    };

    const originalPath = path.join(absDir, `${baseName}-original${ext}`);
    await fs.writeFile(originalPath, file.buffer);

    if (isImage) {
      const pipeline = sharp(file.buffer);
      for (const [sizeName, size] of Object.entries(IMAGE_SIZES)) {
        const filename = `${baseName}-${sizeName}.webp`;
        const relPath = path.join(relDir, filename).replace(/\\/g, '/');
        const absPath = path.join(absDir, filename);
        await pipeline
          .clone()
          .resize(size.width, size.height, { fit: 'cover' })
          .webp({ quality: 85 })
          .toFile(absPath);
        (paths as Record<string, string>)[`path${sizeName.charAt(0).toUpperCase() + sizeName.slice(1)}`] = relPath;
      }
    }

    const upload = await this.prisma.upload.create({
      data: {
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        pathOriginal: paths.pathOriginal,
        pathThumb: paths.pathThumb ?? null,
        pathSmall: paths.pathSmall ?? null,
        pathMedium: paths.pathMedium ?? null,
        uploadedById: uploadedById ?? null,
      },
    });

    return {
      id: upload.id,
      pathOriginal: upload.pathOriginal,
      pathThumb: upload.pathThumb ?? undefined,
      pathSmall: upload.pathSmall ?? undefined,
      pathMedium: upload.pathMedium ?? undefined,
    };
  }
}
