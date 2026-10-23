import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UploadStorageClass } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import sharp from 'sharp';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UploadsRepository } from './uploads.repository';

const IMAGE_SIZES = {
  thumb: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
} as const;
const MAX_INPUT_PIXELS = 40_000_000;
const PUBLIC_IMAGE_MAX_EDGE = 1_600;

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const PUBLIC_PHOTO_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const PUBLIC_ASSET_KINDS = new Set(['brand', 'service', 'blog']);
const IMAGE_FORMATS_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/svg+xml': ['svg'],
};
const SAFE_INLINE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export type UploadedFileResult = {
  id: string;
  pathOriginal: string;
  pathThumb?: string;
  pathSmall?: string;
  pathMedium?: string;
};

export type PrivateFileResult = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  inline: boolean;
};

@Injectable()
export class UploadsService {
  private readonly uploadRoot: string;
  private readonly privateRoot: string;
  private readonly publicRoot: string;

  constructor(
    private readonly repo: UploadsRepository,
    private readonly config: ConfigService,
  ) {
    this.uploadRoot = path.resolve(
      this.config.get<string>(
        'UPLOAD_ROOT',
        path.join(process.cwd(), 'uploads'),
      ),
    );
    this.privateRoot = path.join(this.uploadRoot, 'private');
    this.publicRoot = path.join(this.uploadRoot, 'public');
  }

  /** All generic uploads are private by default. The entity is only a private subfolder. */
  async saveFile(
    file: Express.Multer.File,
    entity: string,
    uploadedById?: string,
  ): Promise<UploadedFileResult> {
    const detected = await this.validateUpload(file);
    const safeEntity = /^[a-z0-9_-]{1,48}$/i.test(entity) ? entity : 'uploads';
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const fileId = randomUUID();
    const relDir = path.join('private', safeEntity, year, month);
    const absDir = path.join(this.uploadRoot, relDir);
    await fs.mkdir(this.privateRoot, { recursive: true, mode: 0o700 });
    await fs.chmod(this.privateRoot, 0o700);
    await fs.mkdir(absDir, { recursive: true, mode: 0o700 });
    await fs.chmod(absDir, 0o700);

    const ext = detected.isImage
      ? this.extensionForMime(detected.mimeType)
      : this.extensionForDocument(detected.mimeType, file.originalname);
    const originalName = `${fileId}-original${ext}`;
    const relativeOriginal = this.toRelativePath(
      path.join(relDir, originalName),
    );
    const absoluteOriginal = path.join(absDir, originalName);
    const paths: {
      pathOriginal: string;
      pathThumb?: string;
      pathSmall?: string;
      pathMedium?: string;
    } = { pathOriginal: relativeOriginal };
    const writtenPaths = [absoluteOriginal];

    try {
      await fs.writeFile(absoluteOriginal, file.buffer, {
        flag: 'wx',
        mode: 0o600,
      });
      if (detected.isImage) {
        await this.writeImageVariants(
          file.buffer,
          absDir,
          relDir,
          fileId,
          paths,
        );
        for (const value of [
          paths.pathThumb,
          paths.pathSmall,
          paths.pathMedium,
        ]) {
          if (value) writtenPaths.push(this.resolveInsideRoot(value));
        }
      }

      const upload = await this.repo.create({
        data: {
          originalName: this.safeOriginalName(file.originalname),
          mimeType: detected.mimeType,
          sizeBytes: file.buffer.length,
          pathOriginal: paths.pathOriginal,
          pathThumb: paths.pathThumb ?? null,
          pathSmall: paths.pathSmall ?? null,
          pathMedium: paths.pathMedium ?? null,
          storageClass: UploadStorageClass.PRIVATE,
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
    } catch (error) {
      await this.removeFiles(writtenPaths);
      throw error;
    }
  }

  /** Only explicit, approved non-client assets can be written into the public static root. */
  async savePublicAsset(
    file: Express.Multer.File,
    assetKind: string,
    uploadedById: string,
  ): Promise<UploadedFileResult> {
    if (!PUBLIC_ASSET_KINDS.has(assetKind)) {
      throw new BadRequestException('Vrsta javnog asseta nije dozvoljena.');
    }
    await this.validateImage(file);
    const fileId = randomUUID();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const relDir = path.join(assetKind, year, month);
    const absDir = path.join(this.publicRoot, relDir);
    await fs.mkdir(this.publicRoot, { recursive: true, mode: 0o755 });
    await fs.mkdir(absDir, { recursive: true, mode: 0o755 });

    const relativeOriginal = this.toRelativePath(
      path.join(relDir, `${fileId}.webp`),
    );
    const image = sharp(file.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize(PUBLIC_IMAGE_MAX_EDGE, PUBLIC_IMAGE_MAX_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 4 });
    const originalBuffer = await image.toBuffer();
    const absoluteOriginal = path.join(this.publicRoot, relativeOriginal);
    const variants: Record<string, string | null> = {
      pathThumb: null,
      pathSmall: null,
      pathMedium: null,
    };
    const writtenPaths = [absoluteOriginal];

    try {
      await fs.writeFile(absoluteOriginal, originalBuffer, {
        flag: 'wx',
        mode: 0o644,
      });
      for (const [sizeName, size] of Object.entries(IMAGE_SIZES)) {
        const key = `path${sizeName.charAt(0).toUpperCase() + sizeName.slice(1)}`;
        const fileName = `${fileId}-${sizeName}.webp`;
        const variantPath = path.join(this.publicRoot, relDir, fileName);
        const relativePath = this.toRelativePath(path.join(relDir, fileName));
        await sharp(file.buffer, { limitInputPixels: MAX_INPUT_PIXELS })
          .rotate()
          .resize(size.width, size.height, { fit: 'cover' })
          .webp({ quality: 84, effort: 4 })
          .toFile(variantPath);
        await fs.chmod(variantPath, 0o644);
        variants[key] = relativePath;
        writtenPaths.push(variantPath);
      }

      const upload = await this.repo.create({
        data: {
          originalName: this.safeOriginalName(file.originalname),
          mimeType: 'image/webp',
          sizeBytes: originalBuffer.length,
          pathOriginal: relativeOriginal,
          pathThumb: variants.pathThumb,
          pathSmall: variants.pathSmall,
          pathMedium: variants.pathMedium,
          storageClass: UploadStorageClass.PUBLIC,
          uploadedById,
        },
      });
      return {
        id: upload.id,
        pathOriginal: upload.pathOriginal,
        pathThumb: upload.pathThumb ?? undefined,
        pathSmall: upload.pathSmall ?? undefined,
        pathMedium: upload.pathMedium ?? undefined,
      };
    } catch (error) {
      await this.removeFiles(writtenPaths);
      throw error;
    }
  }

  /** Make a metadata-free public derivative; the original upload is never moved or exposed. */
  async createConsentDerivative(uploadId: string): Promise<UploadedFileResult> {
    const upload = await this.repo.findById(uploadId);
    if (!upload || upload.storageClass !== UploadStorageClass.PRIVATE) {
      throw new NotFoundException('Privatna slika nije pronađena.');
    }
    if (!PUBLIC_PHOTO_MIMES.has(upload.mimeType.toLowerCase())) {
      throw new BadRequestException(
        'Saglasnost se može dati samo za fotografije.',
      );
    }

    const sourcePath = this.resolveStoredPath(
      upload.pathOriginal,
      upload.storageClass,
    );
    let sourceBuffer: Buffer;
    try {
      sourceBuffer = await fs.readFile(sourcePath);
    } catch {
      throw new NotFoundException('Privatna slika nije dostupna.');
    }
    const imageInfo = await this.readImageInfo(sourceBuffer, upload.mimeType);
    if (!imageInfo) {
      throw new BadRequestException(
        'Sadržaj datoteke nije validna fotografija.',
      );
    }

    const fileId = randomUUID();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const relDir = path.join('private', 'consented', year, month);
    const absDir = path.join(this.uploadRoot, relDir);
    const relativeOriginal = this.toRelativePath(
      path.join(relDir, `${fileId}.webp`),
    );
    const absoluteOriginal = path.join(this.uploadRoot, relativeOriginal);
    await fs.mkdir(this.privateRoot, { recursive: true, mode: 0o700 });
    await fs.chmod(this.privateRoot, 0o700);
    await fs.mkdir(absDir, { recursive: true, mode: 0o700 });
    await fs.chmod(absDir, 0o700);

    try {
      const sanitized = await sharp(sourceBuffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
      })
        .rotate()
        .resize(PUBLIC_IMAGE_MAX_EDGE, PUBLIC_IMAGE_MAX_EDGE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
      await fs.writeFile(absoluteOriginal, sanitized, {
        flag: 'wx',
        mode: 0o600,
      });
      const copy = await this.repo.create({
        data: {
          originalName: 'consented-photo.webp',
          mimeType: 'image/webp',
          sizeBytes: sanitized.length,
          pathOriginal: relativeOriginal,
          pathThumb: null,
          pathSmall: null,
          pathMedium: null,
          storageClass: UploadStorageClass.CONSENTED_PUBLIC,
          uploadedById: upload.uploadedById,
        },
      });
      return { id: copy.id, pathOriginal: copy.pathOriginal };
    } catch (error) {
      await this.removeFiles([absoluteOriginal]);
      throw error;
    }
  }

  /** Read a non-public file only after validating the caller's relationship to its record. */
  async readPrivateFile(
    filePath: string,
    currentUser: Pick<CurrentUserPayload, 'sub' | 'roles'>,
  ): Promise<PrivateFileResult> {
    const normalized = this.normalizeStoredPath(filePath);
    const upload = await this.repo.findByStoredPath(normalized);
    if (!upload || upload.storageClass === UploadStorageClass.PUBLIC) {
      throw new NotFoundException('Fajl nije pronađen.');
    }

    const privileged = currentUser.roles.some((role) =>
      ['SYSTEM_ADMIN', 'OWNER'].includes(role),
    );
    const ownUpload = upload.uploadedById === currentUser.sub;
    const pathVariants = [
      normalized,
      `/${normalized}`,
      `uploads/${normalized.replace(/^uploads\//, '')}`,
      `/uploads/${normalized.replace(/^uploads\//, '')}`,
    ];
    const related =
      upload.storageClass === UploadStorageClass.CONSENTED_PUBLIC
        ? await this.repo.canReadPrivateUpload(
            upload.id,
            currentUser.sub,
            pathVariants,
          )
        : privileged ||
          ownUpload ||
          (await this.repo.canReadPrivateUpload(
            upload.id,
            currentUser.sub,
            pathVariants,
          ));
    if (!related) throw new NotFoundException('Fajl nije pronađen.');

    const storedPath = [
      upload.pathOriginal,
      upload.pathThumb,
      upload.pathSmall,
      upload.pathMedium,
    ].find((candidate) => candidate === normalized);
    if (!storedPath) throw new NotFoundException('Fajl nije pronađen.');

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(
        this.resolveStoredPath(storedPath, upload.storageClass),
      );
    } catch {
      throw new NotFoundException('Fajl nije pronađen.');
    }

    const mimeType = upload.mimeType.toLowerCase();
    const inline = SAFE_INLINE_MIMES.has(mimeType);
    return {
      buffer,
      mimeType: inline ? mimeType : 'application/octet-stream',
      fileName: inline ? 'private-image' : 'private-download',
      inline,
    };
  }

  /** Called only after MediaConsentService has verified an active consent record. */
  async readConsentDerivative(uploadId: string): Promise<PrivateFileResult> {
    const upload = await this.repo.findById(uploadId);
    if (
      !upload ||
      upload.storageClass !== UploadStorageClass.CONSENTED_PUBLIC ||
      upload.mimeType !== 'image/webp'
    ) {
      throw new NotFoundException('Fotografija nije pronađena.');
    }
    try {
      const buffer = await fs.readFile(
        this.resolveStoredPath(upload.pathOriginal, upload.storageClass),
      );
      return {
        buffer,
        mimeType: 'image/webp',
        fileName: 'consented-photo.webp',
        inline: true,
      };
    } catch {
      throw new NotFoundException('Fotografija nije pronađena.');
    }
  }

  async deleteUnreferencedUpload(uploadId: string): Promise<void> {
    const upload = await this.repo.findById(uploadId);
    if (!upload) return;
    const paths = [
      upload.pathOriginal,
      upload.pathThumb,
      upload.pathSmall,
      upload.pathMedium,
    ].filter((value): value is string => Boolean(value));
    if (await this.repo.hasReferences(upload.id, paths)) return;
    await this.removeFiles(
      paths.map((filePath) =>
        this.resolveStoredPath(filePath, upload.storageClass),
      ),
    );
    await this.repo.deleteById(upload.id);
  }

  async deleteByPathOriginal(
    pathOriginal: string,
    currentUser: Pick<CurrentUserPayload, 'sub' | 'roles'>,
  ): Promise<{ deleted: boolean }> {
    const normalized = this.normalizeStoredPath(pathOriginal);
    if (!normalized) {
      throw new BadRequestException('Putanja fajla nije validna.');
    }

    const upload = await this.repo.findFirstByPathOriginal(normalized);
    if (!upload) throw new NotFoundException('Upload nije pronađen.');

    const isAdminOrOwner = currentUser.roles.some((role) =>
      ['SYSTEM_ADMIN', 'OWNER'].includes(role),
    );
    if (!isAdminOrOwner && upload.uploadedById !== currentUser.sub) {
      throw new ForbiddenException('Nemate dozvolu za brisanje ovog uploada.');
    }

    const paths = [
      upload.pathOriginal,
      upload.pathThumb,
      upload.pathSmall,
      upload.pathMedium,
    ]
      .filter((filePath): filePath is string => typeof filePath === 'string')
      .map((filePath) => this.normalizeStoredPath(filePath))
      .filter(Boolean);
    const absolutePaths = paths.map((filePath) =>
      this.resolveStoredPath(filePath, upload.storageClass),
    );

    if (await this.repo.hasReferences(upload.id, paths)) {
      throw new ConflictException(
        'Upload je vezan za postojeće podatke i ne može se obrisati.',
      );
    }

    await this.removeFiles(absolutePaths);
    await this.repo.deleteById(upload.id);
    return { deleted: true };
  }

  private async validateUpload(file: Express.Multer.File): Promise<{
    mimeType: string;
    isImage: boolean;
  }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Nijedna datoteka nije poslata.');
    }
    const mimeType = String(file.mimetype ?? '').toLowerCase();
    if (IMAGE_MIMES.has(mimeType)) {
      const info = await this.readImageInfo(file.buffer, mimeType);
      if (!info) {
        throw new BadRequestException(
          'Sadržaj datoteke nije validna fotografija.',
        );
      }
      return { mimeType, isImage: true };
    }
    if (
      DOC_MIMES.has(mimeType) &&
      this.hasExpectedDocumentSignature(
        file.buffer,
        mimeType,
        file.originalname,
      )
    ) {
      return { mimeType, isImage: false };
    }
    throw new BadRequestException('Tip ili sadržaj datoteke nije dozvoljen.');
  }

  private async validateImage(file: Express.Multer.File): Promise<{
    mimeType: string;
  }> {
    if (
      !file?.buffer?.length ||
      !PUBLIC_PHOTO_MIMES.has(String(file.mimetype ?? '').toLowerCase())
    ) {
      throw new BadRequestException('Dozvoljen je samo validan image fajl.');
    }
    const mimeType = String(file.mimetype).toLowerCase();
    const info = await this.readImageInfo(file.buffer, mimeType);
    if (!info) {
      throw new BadRequestException(
        'Sadržaj datoteke nije validna fotografija.',
      );
    }
    return { mimeType };
  }

  private async readImageInfo(
    buffer: Buffer,
    mimeType: string,
  ): Promise<sharp.Metadata | null> {
    try {
      const info = await sharp(buffer, {
        limitInputPixels: MAX_INPUT_PIXELS,
        failOn: 'error',
      }).metadata();
      const formats = IMAGE_FORMATS_BY_MIME[mimeType.toLowerCase()] ?? [];
      return info.format && formats.includes(info.format) ? info : null;
    } catch {
      return null;
    }
  }

  private hasExpectedDocumentSignature(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): boolean {
    const ascii = buffer.subarray(0, 8).toString('ascii');
    if (mimeType === 'application/pdf') return ascii.startsWith('%PDF-');
    if (mimeType === 'application/msword') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    }
    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      const lowerName = String(originalName ?? '').toLowerCase();
      const expectedExtension = mimeType.includes('wordprocessing')
        ? '.docx'
        : '.xlsx';
      return lowerName.endsWith(expectedExtension) && ascii.startsWith('PK');
    }
    if (mimeType === 'application/vnd.ms-excel') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    }
    return false;
  }

  private extensionForMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'image/svg+xml':
        return '.svg';
      default:
        return '.bin';
    }
  }

  private extensionForDocument(mimeType: string, originalName: string): string {
    if (mimeType === 'application/pdf') return '.pdf';
    if (mimeType === 'application/msword') return '.doc';
    if (mimeType === 'application/vnd.ms-excel') return '.xls';
    const lowerName = String(originalName ?? '').toLowerCase();
    return lowerName.endsWith('.xlsx') ? '.xlsx' : '.docx';
  }

  private safeOriginalName(name: string): string {
    const normalized = String(name ?? 'file').replace(/\\/g, '/');
    return path.posix.basename(normalized).slice(0, 255);
  }

  private toRelativePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  private normalizeStoredPath(filePath: string): string {
    const normalized = String(filePath ?? '')
      .trim()
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');
    if (!normalized || normalized.includes('\0')) {
      throw new BadRequestException('Putanja fajla nije validna.');
    }
    return normalized;
  }

  private resolveInsideRoot(relativePath: string): string {
    return this.resolveWithin(this.uploadRoot, relativePath);
  }

  private resolveStoredPath(
    relativePath: string,
    storageClass: UploadStorageClass,
  ): string {
    if (storageClass === UploadStorageClass.PUBLIC) {
      return this.resolveWithin(this.publicRoot, relativePath);
    }
    if (storageClass === UploadStorageClass.CONSENTED_PUBLIC) {
      const normalized = String(relativePath ?? '').replace(/\\/g, '/');
      const prefix = 'private/consented/';
      if (!normalized.startsWith(prefix)) {
        throw new BadRequestException('Putanja consent fajla nije validna.');
      }
      return this.resolveWithin(
        path.join(this.privateRoot, 'consented'),
        normalized.slice(prefix.length),
      );
    }
    return this.resolveWithin(this.uploadRoot, relativePath);
  }

  private resolveWithin(root: string, relativePath: string): string {
    const normalizedRelativePath = relativePath.replace(/\\/g, '/');
    const absolutePath = path.resolve(root, normalizedRelativePath);
    if (
      absolutePath === root ||
      !absolutePath.startsWith(`${root}${path.sep}`)
    ) {
      throw new BadRequestException('Putanja fajla nije validna.');
    }
    return absolutePath;
  }

  private async writeImageVariants(
    buffer: Buffer,
    absoluteDir: string,
    relativeDir: string,
    fileId: string,
    paths: {
      pathThumb?: string;
      pathSmall?: string;
      pathMedium?: string;
    },
  ): Promise<void> {
    for (const [sizeName, size] of Object.entries(IMAGE_SIZES)) {
      const fileName = `${fileId}-${sizeName}.webp`;
      const relativePath = this.toRelativePath(
        path.join(relativeDir, fileName),
      );
      const absolutePath = path.join(absoluteDir, fileName);
      await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize(size.width, size.height, { fit: 'cover' })
        .webp({ quality: 85 })
        .toFile(absolutePath);
      await fs.chmod(absolutePath, 0o600);
      (paths as Record<string, string>)[
        `path${sizeName.charAt(0).toUpperCase() + sizeName.slice(1)}`
      ] = relativePath;
    }
  }

  private async removeFiles(filePaths: string[]): Promise<void> {
    await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          await fs.unlink(filePath);
        } catch {
          // Best-effort cleanup for incomplete writes.
        }
      }),
    );
  }
}
