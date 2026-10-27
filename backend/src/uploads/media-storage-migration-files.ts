import * as fs from 'fs/promises';
import type { Stats } from 'fs';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import sharp from 'sharp';
import type { MediaCopyOperation } from './media-storage-migration';

const MAX_INPUT_PIXELS = 40_000_000;

export class MediaMigrationCleanupError extends Error {
  constructor() {
    super(
      'Migracijske kopije ili quarantine putanje nije bilo moguće sigurno vratiti ili ukloniti.',
    );
    this.name = 'MediaMigrationCleanupError';
  }
}

export function resolveMediaStoragePath(
  uploadRoot: string,
  relativePath: string,
): string {
  const root = path.resolve(uploadRoot);
  const normalized = relativePath.replace(/\\/g, '/');
  if (
    !normalized ||
    normalized.startsWith('/') ||
    normalized.includes('\0') ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split('/').some((segment) => segment === '..' || segment === '.')
  ) {
    throw new Error('Nesigurna putanja.');
  }
  const absolute = path.resolve(root, normalized);
  if (absolute === root || !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error('Nesigurna putanja.');
  }
  return absolute;
}

async function assertUploadRoot(root: string): Promise<void> {
  const absoluteRoot = path.resolve(root);
  const parsed = path.parse(absoluteRoot);
  let current = parsed.root;
  const filesystemRootStats = await fs.lstat(current);
  if (
    filesystemRootStats.isSymbolicLink() ||
    !filesystemRootStats.isDirectory()
  ) {
    throw new Error('UPLOAD_ROOT putanja ne smije sadržavati simboličke veze.');
  }
  for (const segment of absoluteRoot
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, segment);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(
        'UPLOAD_ROOT putanja ne smije sadržavati simboličke veze.',
      );
    }
  }
}

async function assertRegularFile(
  root: string,
  absolutePath: string,
): Promise<void> {
  await assertUploadRoot(root);
  const relative = path.relative(root, absolutePath);
  let current = root;
  const parts = relative.split(path.sep).filter(Boolean);
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink())
      throw new Error('Simbolička veza nije dozvoljena.');
    if (index === parts.length - 1 ? !stats.isFile() : !stats.isDirectory()) {
      throw new Error('Neočekivan tip putanje.');
    }
  }
}

async function destinationExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(filePath);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error('Odredište nije obična datoteka.');
    }
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

async function assertSafeExistingParentDirectories(
  root: string,
  filePath: string,
): Promise<void> {
  await assertUploadRoot(root);
  const relative = path.relative(root, path.dirname(filePath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Odredišni direktorij izlazi iz korijena.');
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        throw new Error('Nesiguran direktorij u putanji.');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
  }
}

async function ensureSafeDirectories(
  root: string,
  filePath: string,
): Promise<void> {
  await assertUploadRoot(root);
  const directoryPath = path.dirname(filePath);
  const relative = path.relative(root, directoryPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Odredišni direktorij izlazi iz korijena.');
  }
  const firstSegment = relative.split(path.sep).filter(Boolean)[0];
  const mode = firstSegment === 'public' ? 0o755 : 0o700;
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        throw new Error('Nesiguran direktorij u putanji.');
      }
      await fs.chmod(current, mode);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await fs.mkdir(current, { mode });
      await fs.chmod(current, mode);
    }
  }
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function assertExpectedContent(
  operation: MediaCopyOperation,
  original: Buffer,
): void {
  if (
    operation.expectedSizeBytes !== undefined &&
    operation.expectedSizeBytes !== original.length
  ) {
    throw new Error('Veličina datoteke ne odgovara evidenciji.');
  }
  if (
    operation.expectedSha256 &&
    sha256(original) !== operation.expectedSha256.toLowerCase()
  ) {
    throw new Error('Kontrolni zbir datoteke ne odgovara evidenciji.');
  }
}

function expectedImageFormat(operation: MediaCopyOperation): string | null {
  const extension = path
    .extname(operation.destinationRelativePath)
    .toLowerCase();
  return extension === '.jpg' || extension === '.jpeg'
    ? 'jpeg'
    : extension === '.png'
      ? 'png'
      : extension === '.webp'
        ? 'webp'
        : null;
}

async function prepareCopy(
  operation: MediaCopyOperation,
  original: Buffer,
): Promise<Buffer> {
  assertExpectedContent(operation, original);
  if (operation.visibility !== 'PUBLIC') return original;

  if (operation.contentType === 'APK') {
    if (
      path.extname(operation.destinationRelativePath).toLowerCase() !==
        '.apk' ||
      original.length < 4 ||
      !original.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    ) {
      throw new Error('APK nema očekivanu ekstenziju ili ZIP potpis.');
    }
    return original;
  }

  if (operation.contentType !== 'IMAGE') {
    throw new Error('Nepoznat javni tip medija.');
  }
  const expectedFormat = expectedImageFormat(operation);
  if (!expectedFormat) {
    throw new Error(
      'Javni legacy medij mora biti JPEG, PNG ili WebP koji odgovara ekstenziji.',
    );
  }
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(original, {
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
  } catch {
    throw new Error('Javni legacy medij nije validna raster fotografija.');
  }
  if (metadata.format !== expectedFormat) {
    throw new Error(
      'Javni legacy medij mora biti JPEG, PNG ili WebP koji odgovara ekstenziji.',
    );
  }
  const image = sharp(original, {
    limitInputPixels: MAX_INPUT_PIXELS,
  }).rotate();
  if (expectedFormat === 'jpeg')
    return image.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  if (expectedFormat === 'png')
    return image.png({ compressionLevel: 9 }).toBuffer();
  return image.webp({ quality: 90 }).toBuffer();
}

async function assertExistingPublicCopy(
  operation: MediaCopyOperation,
  buffer: Buffer,
): Promise<void> {
  assertExpectedContent(operation, buffer);
  if (operation.contentType === 'APK') {
    if (
      path.extname(operation.destinationRelativePath).toLowerCase() !==
        '.apk' ||
      buffer.length < 4 ||
      !buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    ) {
      throw new Error('Javni APK nema očekivanu ekstenziju ili ZIP potpis.');
    }
    return;
  }
  const expectedFormat = expectedImageFormat(operation);
  const metadata = await sharp(buffer, {
    limitInputPixels: MAX_INPUT_PIXELS,
  }).metadata();
  if (
    operation.contentType !== 'IMAGE' ||
    !expectedFormat ||
    metadata.format !== expectedFormat ||
    metadata.exif ||
    metadata.iptc ||
    metadata.xmp
  ) {
    throw new Error(
      'Javni postojeći medij nije sanitizovan ili format nije podržan.',
    );
  }
}

async function verifyExistingCopy(
  root: string,
  operation: MediaCopyOperation,
  sourcePath: string,
  destinationPath: string,
): Promise<void> {
  await assertRegularFile(root, destinationPath);
  const destinationBuffer = await fs.readFile(destinationPath);
  await assertRegularFile(root, sourcePath);
  const sourceBuffer = await fs.readFile(sourcePath);
  if (operation.visibility === 'PUBLIC') {
    const expectedPublicCopy = await prepareCopy(operation, sourceBuffer);
    await assertExistingPublicCopy(operation, destinationBuffer);
    if (sha256(expectedPublicCopy) !== sha256(destinationBuffer)) {
      throw new Error('Javna ciljna kopija se razlikuje od izvora.');
    }
    return;
  }
  assertExpectedContent(operation, sourceBuffer);
  if (sha256(sourceBuffer) !== sha256(destinationBuffer)) {
    throw new Error('Privatna ciljna kopija se razlikuje od izvora.');
  }
}

function assertOperationPaths(
  root: string,
  operation: MediaCopyOperation,
): void {
  const validDestination =
    operation.destinationRelativePath.startsWith('public/') ||
    operation.destinationRelativePath.startsWith('private/');
  if (!validDestination)
    throw new Error('Odredište mora biti public ili private.');
  resolveMediaStoragePath(root, operation.sourceRelativePath);
  resolveMediaStoragePath(root, operation.destinationRelativePath);
  if (
    operation.visibility === 'PUBLIC' &&
    !operation.destinationRelativePath.startsWith('public/')
  ) {
    throw new Error('Javna kopija mora biti ispod public direktorija.');
  }
  if (
    operation.visibility === 'PRIVATE' &&
    !operation.destinationRelativePath.startsWith('private/')
  ) {
    throw new Error('Privatna kopija mora biti ispod private direktorija.');
  }
}

export async function preflightMediaCopyOperations(
  uploadRoot: string,
  operations: MediaCopyOperation[],
): Promise<void> {
  const root = path.resolve(uploadRoot);
  await assertUploadRoot(root);

  for (const operation of operations) {
    assertOperationPaths(root, operation);
    const sourcePath = resolveMediaStoragePath(
      root,
      operation.sourceRelativePath,
    );
    const destinationPath = resolveMediaStoragePath(
      root,
      operation.destinationRelativePath,
    );
    await assertSafeExistingParentDirectories(root, destinationPath);
    if (await destinationExists(destinationPath)) {
      await verifyExistingCopy(root, operation, sourcePath, destinationPath);
      continue;
    }
    await assertRegularFile(root, sourcePath);
    await prepareCopy(operation, await fs.readFile(sourcePath));
  }
}

export interface QuarantinedPublicFile {
  publicRelativePath: string;
  privateRelativePath: string;
  originalMode: number;
  sha256: string;
  sourceRemoved: boolean;
}

export async function listUnmappedPublicFiles(
  uploadRoot: string,
  operations: MediaCopyOperation[],
): Promise<string[]> {
  const root = path.resolve(uploadRoot);
  await assertUploadRoot(root);
  const publicRoot = path.join(root, 'public');
  const allowed = new Set(
    operations
      .filter((operation) => operation.visibility === 'PUBLIC')
      .map((operation) => {
        assertOperationPaths(root, operation);
        return operation.destinationRelativePath;
      }),
  );
  let rootStats: Stats;
  try {
    rootStats = await fs.lstat(publicRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error('Javni root mora biti običan direktorij.');
  }

  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const name of await fs.readdir(directory)) {
      const absolute = path.join(directory, name);
      const stats = await fs.lstat(absolute);
      if (stats.isSymbolicLink()) {
        throw new Error('Simbolička veza nije dozvoljena u javnom root-u.');
      }
      if (stats.isDirectory()) {
        await visit(absolute);
      } else if (stats.isFile()) {
        const relative = path.relative(root, absolute).replace(/\\/g, '/');
        if (!allowed.has(relative)) files.push(relative);
      } else {
        throw new Error('Javni root sadrži nepodržan tip datoteke.');
      }
    }
  };
  await visit(publicRoot);
  return files.sort();
}

export async function restoreQuarantinedPublicFiles(
  uploadRoot: string,
  moves: QuarantinedPublicFile[],
): Promise<void> {
  const root = path.resolve(uploadRoot);
  await assertUploadRoot(root);
  for (const move of [...moves].reverse()) {
    const publicPath = resolveMediaStoragePath(root, move.publicRelativePath);
    const privatePath = resolveMediaStoragePath(root, move.privateRelativePath);
    const publicExists = await destinationExists(publicPath);
    const privateExists = await destinationExists(privatePath);
    if (publicExists) await assertRegularFile(root, publicPath);
    if (privateExists) await assertRegularFile(root, privatePath);

    if (publicExists) {
      const publicHash = sha256(await fs.readFile(publicPath));
      if (move.sourceRemoved && publicHash !== move.sha256) {
        throw new Error('Javna putanja je promijenjena tokom rollback-a.');
      }
      if (privateExists) await fs.unlink(privatePath);
      await fs.chmod(publicPath, move.originalMode);
      continue;
    }
    if (!privateExists) {
      throw new Error('Quarantine kopija nedostaje tokom rollback-a.');
    }

    const buffer = await fs.readFile(privatePath);
    if (sha256(buffer) !== move.sha256) {
      throw new Error('Quarantine kopija nije prošla rollback checksum.');
    }
    await ensureSafeDirectories(root, publicPath);
    const handle = await fs.open(publicPath, 'wx', move.originalMode);
    try {
      await handle.writeFile(buffer);
    } finally {
      await handle.close();
    }
    await fs.chmod(publicPath, move.originalMode);
    if (sha256(await fs.readFile(publicPath)) !== move.sha256) {
      throw new Error('Obnovljena javna kopija nije prošla checksum.');
    }
    await fs.unlink(privatePath);
  }
}

export async function quarantineUnmappedPublicFiles(
  uploadRoot: string,
  operations: MediaCopyOperation[],
): Promise<QuarantinedPublicFile[]> {
  const root = path.resolve(uploadRoot);
  const candidates = await listUnmappedPublicFiles(root, operations);
  const moves: QuarantinedPublicFile[] = [];
  try {
    for (const publicRelativePath of candidates) {
      const publicPath = resolveMediaStoragePath(root, publicRelativePath);
      const relativeFromPublic = publicRelativePath.slice('public/'.length);
      const privateRelativePath = path.posix.join(
        'private',
        'legacy',
        'public-root',
        relativeFromPublic,
      );
      const privatePath = resolveMediaStoragePath(root, privateRelativePath);
      await assertRegularFile(root, publicPath);
      await assertSafeExistingParentDirectories(root, privatePath);
      if (await destinationExists(privatePath)) {
        throw new Error('Private quarantine putanja već postoji.');
      }
      await ensureSafeDirectories(root, privatePath);
      const sourceStats = await fs.lstat(publicPath);
      const buffer = await fs.readFile(publicPath);
      const handle = await fs.open(privatePath, 'wx', 0o600);
      const move: QuarantinedPublicFile = {
        publicRelativePath,
        privateRelativePath,
        originalMode: sourceStats.mode & 0o777,
        sha256: sha256(buffer),
        sourceRemoved: false,
      };
      moves.push(move);
      try {
        await handle.writeFile(buffer);
      } finally {
        await handle.close();
      }
      await fs.chmod(privatePath, 0o600);
      if (sha256(await fs.readFile(privatePath)) !== move.sha256) {
        throw new Error('Privatna quarantine kopija nije prošla checksum.');
      }
      await fs.unlink(publicPath);
      move.sourceRemoved = true;
    }
    return moves;
  } catch (error) {
    try {
      await restoreQuarantinedPublicFiles(root, moves);
    } catch {
      throw new MediaMigrationCleanupError();
    }
    throw error;
  }
}

export async function cleanupMediaMigrationFiles(
  uploadRoot: string,
  createdPaths: string[],
): Promise<void> {
  const root = path.resolve(uploadRoot);
  const cleanupResults = await Promise.allSettled(
    createdPaths.map(async (relativePath) => {
      const absolutePath = resolveMediaStoragePath(root, relativePath);
      await assertSafeExistingParentDirectories(root, absolutePath);
      if (await destinationExists(absolutePath)) {
        await assertRegularFile(root, absolutePath);
        await fs.unlink(absolutePath);
      }
    }),
  );
  if (cleanupResults.some((result) => result.status === 'rejected')) {
    throw new MediaMigrationCleanupError();
  }
}

export async function copyAndVerifyMediaFiles(
  uploadRoot: string,
  operations: MediaCopyOperation[],
  linkFile: (
    sourcePath: string,
    destinationPath: string,
  ) => Promise<void> = fs.link,
): Promise<string[]> {
  const root = path.resolve(uploadRoot);
  await preflightMediaCopyOperations(root, operations);
  const createdDestinations: string[] = [];
  const temporaryFiles: string[] = [];
  try {
    for (const operation of operations) {
      assertOperationPaths(root, operation);
      const sourcePath = resolveMediaStoragePath(
        root,
        operation.sourceRelativePath,
      );
      const destinationPath = resolveMediaStoragePath(
        root,
        operation.destinationRelativePath,
      );
      if (await destinationExists(destinationPath)) {
        await verifyExistingCopy(root, operation, sourcePath, destinationPath);
        continue;
      }
      await assertRegularFile(root, sourcePath);
      const sourceBuffer = await fs.readFile(sourcePath);
      const prepared = await prepareCopy(operation, sourceBuffer);
      const expectedHash = sha256(prepared);
      const tempRelativePath = `private/.media-migration-${randomUUID()}.tmp`;
      const tempPath = resolveMediaStoragePath(root, tempRelativePath);
      await ensureSafeDirectories(root, tempPath);
      let tempCreated = false;
      try {
        const tempHandle = await fs.open(
          tempPath,
          'wx',
          operation.visibility === 'PUBLIC' ? 0o644 : 0o600,
        );
        tempCreated = true;
        temporaryFiles.push(tempRelativePath);
        try {
          await tempHandle.writeFile(prepared);
        } finally {
          await tempHandle.close();
        }
        await assertRegularFile(root, tempPath);
        if (sha256(await fs.readFile(tempPath)) !== expectedHash) {
          throw new Error(
            'Privremena kopija nije prošla provjeru kontrolnog zbira.',
          );
        }
        await ensureSafeDirectories(root, destinationPath);
        await linkFile(tempPath, destinationPath);
        createdDestinations.push(operation.destinationRelativePath);
      } finally {
        if (tempCreated) {
          try {
            await fs.unlink(tempPath);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              throw new Error(
                'Privremena migracijska datoteka nije uklonjena.',
              );
            }
          }
        }
      }
      await assertRegularFile(root, destinationPath);
      if (sha256(await fs.readFile(destinationPath)) !== expectedHash) {
        throw new Error(
          'Kopirana datoteka nije prošla provjeru kontrolnog zbira.',
        );
      }
    }
    return createdDestinations;
  } catch (error) {
    try {
      await cleanupMediaMigrationFiles(root, [
        ...createdDestinations,
        ...temporaryFiles,
      ]);
    } catch {
      throw new MediaMigrationCleanupError();
    }
    throw error;
  }
}
