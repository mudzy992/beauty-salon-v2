import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import sharp from 'sharp';
import {
  cleanupMediaMigrationFiles,
  copyAndVerifyMediaFiles,
  listUnmappedPublicFiles,
  preflightMediaCopyOperations,
  quarantineUnmappedPublicFiles,
  restoreQuarantinedPublicFiles,
} from './media-storage-migration-files';
import type { MediaCopyOperation } from './media-storage-migration';

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

describe('media migration file operations (synthetic filesystem only)', () => {
  let uploadRoot: string;

  beforeEach(async () => {
    uploadRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), 'media-migration-test-'),
    );
  });

  afterEach(async () => {
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  const writeSource = async (relativePath: string, buffer: Buffer) => {
    const filePath = path.join(uploadRoot, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    return filePath;
  };

  it('copies an allowlisted JPEG into public storage without embedded EXIF metadata', async () => {
    const source = await sharp({
      create: { width: 8, height: 6, channels: 3, background: '#c84b31' },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Artist: 'synthetic-test' } } })
      .toBuffer();
    const sourcePath = await writeSource('legacy/service/hero.jpg', source);
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/service/hero.jpg',
      destinationRelativePath: 'public/service/hero.jpg',
      visibility: 'PUBLIC',
      contentType: 'IMAGE',
    };

    await preflightMediaCopyOperations(uploadRoot, [operation]);
    expect(await exists(path.join(uploadRoot, 'public/service/hero.jpg'))).toBe(
      false,
    );

    const copied = await copyAndVerifyMediaFiles(uploadRoot, [operation]);
    const publicPath = path.join(uploadRoot, 'public/service/hero.jpg');
    const publicBuffer = await fs.readFile(publicPath);
    const publicMetadata = await sharp(publicBuffer).metadata();
    const publicDirectoryStats = await fs.stat(path.dirname(publicPath));

    expect(publicDirectoryStats.mode & 0o777).toBe(0o755);
    expect(copied).toEqual(['public/service/hero.jpg']);
    expect(publicMetadata.format).toBe('jpeg');
    expect(publicMetadata.exif).toBeUndefined();
    expect(publicMetadata.width).toBe(8);
    expect(await fs.readFile(sourcePath)).toEqual(source);
    await expect(
      preflightMediaCopyOperations(uploadRoot, [operation]),
    ).resolves.toBeUndefined();
    await expect(
      copyAndVerifyMediaFiles(uploadRoot, [operation]),
    ).resolves.toEqual([]);
  });

  it('copies private files byte-for-byte under private storage and keeps the legacy source', async () => {
    const source = Buffer.from('%PDF-1.7\nsynthetic private invoice\n');
    await writeSource('legacy/finance/invoice.pdf', source);
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/finance/invoice.pdf',
      destinationRelativePath: 'private/legacy/invoice.pdf',
      visibility: 'PRIVATE',
      contentType: 'AUTO',
      expectedSha256: createHash('sha256').update(source).digest('hex'),
      expectedSizeBytes: source.length,
    };

    const copied = await copyAndVerifyMediaFiles(uploadRoot, [operation]);
    const privatePath = path.join(uploadRoot, 'private/legacy/invoice.pdf');
    const stats = await fs.stat(privatePath);
    const privateDirectoryStats = await fs.stat(path.dirname(privatePath));

    expect(privateDirectoryStats.mode & 0o777).toBe(0o700);
    expect(copied).toEqual(['private/legacy/invoice.pdf']);
    expect(await fs.readFile(privatePath)).toEqual(source);
    expect(stats.mode & 0o777).toBe(0o600);
    expect(
      await exists(path.join(uploadRoot, 'legacy/finance/invoice.pdf')),
    ).toBe(true);
    expect(await exists(path.join(uploadRoot, 'public'))).toBe(false);
  });

  it('copies a published APK only after ZIP, size, and checksum validation', async () => {
    const source = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]);
    await writeSource('legacy/releases/release.apk', source);
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/releases/release.apk',
      destinationRelativePath: 'public/app-releases/release.apk',
      visibility: 'PUBLIC',
      contentType: 'APK',
      expectedSha256: createHash('sha256').update(source).digest('hex'),
      expectedSizeBytes: source.length,
    };

    await expect(
      copyAndVerifyMediaFiles(uploadRoot, [operation]),
    ).resolves.toEqual(['public/app-releases/release.apk']);
    expect(
      await fs.readFile(
        path.join(uploadRoot, 'public/app-releases/release.apk'),
      ),
    ).toEqual(source);
  });

  it('rejects a published APK with a bad ZIP signature', async () => {
    const source = Buffer.from('not-an-apk');
    await writeSource('legacy/releases/bad.apk', source);
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/releases/bad.apk',
      destinationRelativePath: 'public/app-releases/bad.apk',
      visibility: 'PUBLIC',
      contentType: 'APK',
      expectedSha256: createHash('sha256').update(source).digest('hex'),
      expectedSizeBytes: source.length,
    };

    await expect(
      preflightMediaCopyOperations(uploadRoot, [operation]),
    ).rejects.toThrow('APK nema očekivanu ekstenziju ili ZIP potpis.');
    expect(
      await exists(path.join(uploadRoot, 'public/app-releases/bad.apk')),
    ).toBe(false);
  });

  it('rejects a public image whose content or extension is not an allowed raster format', async () => {
    await writeSource('legacy/logo.svg', Buffer.from('<svg><script/></svg>'));
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/logo.svg',
      destinationRelativePath: 'public/brand/logo.svg',
      visibility: 'PUBLIC',
      contentType: 'IMAGE',
    };

    await expect(
      preflightMediaCopyOperations(uploadRoot, [operation]),
    ).rejects.toThrow(
      'Javni legacy medij mora biti JPEG, PNG ili WebP koji odgovara ekstenziji.',
    );
    expect(await exists(path.join(uploadRoot, 'public/brand/logo.svg'))).toBe(
      false,
    );
  });

  it('rejects checksum mismatches before creating a private copy', async () => {
    await writeSource('legacy/client.jpg', Buffer.from('private-source'));
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/client.jpg',
      destinationRelativePath: 'private/legacy/client.jpg',
      visibility: 'PRIVATE',
      contentType: 'AUTO',
      expectedSha256: '0'.repeat(64),
    };

    await expect(
      preflightMediaCopyOperations(uploadRoot, [operation]),
    ).rejects.toThrow('Kontrolni zbir datoteke ne odgovara evidenciji.');
    expect(
      await exists(path.join(uploadRoot, 'private/legacy/client.jpg')),
    ).toBe(false);
  });

  it('rejects an UPLOAD_ROOT whose parent directory is a symlink', async () => {
    const actualParent = path.join(uploadRoot, 'real-parent');
    const aliasedParent = path.join(uploadRoot, 'aliased-parent');
    await fs.mkdir(path.join(actualParent, 'volume'), { recursive: true });
    await fs.symlink(actualParent, aliasedParent, 'dir');

    await expect(
      preflightMediaCopyOperations(path.join(aliasedParent, 'volume'), []),
    ).rejects.toThrow(
      'UPLOAD_ROOT putanja ne smije sadržavati simboličke veze.',
    );
  });

  it('rejects a symlinked public destination directory during preflight', async () => {
    const image = await sharp({
      create: { width: 4, height: 4, channels: 3, background: '#365c91' },
    })
      .jpeg()
      .toBuffer();
    await writeSource('legacy/public.jpg', image);
    await fs.mkdir(path.join(uploadRoot, 'real-public'), { recursive: true });
    await fs.symlink(
      path.join(uploadRoot, 'real-public'),
      path.join(uploadRoot, 'public'),
      'dir',
    );
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/public.jpg',
      destinationRelativePath: 'public/brand/public.jpg',
      visibility: 'PUBLIC',
      contentType: 'IMAGE',
    };

    await expect(
      preflightMediaCopyOperations(uploadRoot, [operation]),
    ).rejects.toThrow('Nesiguran direktorij u putanji.');
    expect(
      await exists(path.join(uploadRoot, 'real-public/brand/public.jpg')),
    ).toBe(false);
  });

  it('rejects symlinked source files and unsafe destination traversal', async () => {
    const source = await writeSource('legacy/real.pdf', Buffer.from('private'));
    await fs.mkdir(path.join(uploadRoot, 'legacy'), { recursive: true });
    await fs.symlink(source, path.join(uploadRoot, 'legacy/link.pdf'));
    const symlinkOperation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/link.pdf',
      destinationRelativePath: 'private/legacy/link.pdf',
      visibility: 'PRIVATE',
      contentType: 'AUTO',
    };
    await expect(
      preflightMediaCopyOperations(uploadRoot, [symlinkOperation]),
    ).rejects.toThrow('Simbolička veza nije dozvoljena.');

    const traversalOperation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/real.pdf',
      destinationRelativePath: 'public/../private/escape.pdf',
      visibility: 'PUBLIC',
      contentType: 'IMAGE',
    };
    await expect(
      preflightMediaCopyOperations(uploadRoot, [traversalOperation]),
    ).rejects.toThrow('Nesigurna putanja.');
  });

  it('removes earlier destinations when a later atomic copy fails', async () => {
    await writeSource('legacy/first.pdf', Buffer.from('%PDF-1.4 first'));
    await writeSource('legacy/second.pdf', Buffer.from('%PDF-1.4 second'));
    const operations: MediaCopyOperation[] = [
      {
        sourceRelativePath: 'legacy/first.pdf',
        destinationRelativePath: 'private/legacy/first.pdf',
        visibility: 'PRIVATE',
        contentType: 'AUTO',
      },
      {
        sourceRelativePath: 'legacy/second.pdf',
        destinationRelativePath: 'private/legacy/second.pdf',
        visibility: 'PRIVATE',
        contentType: 'AUTO',
      },
    ];
    let linkAttempts = 0;
    const linkWithSyntheticFailure = async (
      source: string,
      destination: string,
    ) => {
      linkAttempts += 1;
      if (linkAttempts === 2) throw new Error('synthetic copy failure');
      await fs.link(source, destination);
    };

    await expect(
      copyAndVerifyMediaFiles(uploadRoot, operations, linkWithSyntheticFailure),
    ).rejects.toThrow('synthetic copy failure');

    expect(
      await exists(path.join(uploadRoot, 'private/legacy/first.pdf')),
    ).toBe(false);
    expect(
      await exists(path.join(uploadRoot, 'private/legacy/second.pdf')),
    ).toBe(false);
    expect(await exists(path.join(uploadRoot, 'legacy/first.pdf'))).toBe(true);
    expect(await exists(path.join(uploadRoot, 'legacy/second.pdf'))).toBe(true);
  });

  it('quarantines unallowlisted files under the new public root and can restore them', async () => {
    const legacyBytes = Buffer.from('synthetic legacy client media');
    const legacyPath = await writeSource(
      'public/legacy-client-photo.jpg',
      legacyBytes,
    );
    await fs.chmod(legacyPath, 0o644);
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/approved-logo.webp',
      destinationRelativePath: 'public/brand/approved-logo.webp',
      visibility: 'PUBLIC',
      contentType: 'IMAGE',
    };

    await expect(
      listUnmappedPublicFiles(uploadRoot, [operation]),
    ).resolves.toEqual(['public/legacy-client-photo.jpg']);
    const moves = await quarantineUnmappedPublicFiles(uploadRoot, [operation]);
    const privatePath = path.join(
      uploadRoot,
      'private/legacy/public-root/legacy-client-photo.jpg',
    );

    expect(moves).toHaveLength(1);
    expect(await exists(legacyPath)).toBe(false);
    expect(await fs.readFile(privatePath)).toEqual(legacyBytes);
    expect((await fs.stat(privatePath)).mode & 0o777).toBe(0o600);
    await expect(
      listUnmappedPublicFiles(uploadRoot, [operation]),
    ).resolves.toEqual([]);

    await restoreQuarantinedPublicFiles(uploadRoot, moves);
    expect(await fs.readFile(legacyPath)).toEqual(legacyBytes);
    expect((await fs.stat(legacyPath)).mode & 0o777).toBe(0o644);
    expect(await exists(privatePath)).toBe(false);
  });

  it('keeps a legacy entity=public upload private and restores it if DB mapping rolls back', async () => {
    const legacyBytes = Buffer.from('synthetic private client photo');
    const legacyPath = await writeSource(
      'public/client-photo.jpg',
      legacyBytes,
    );
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'public/client-photo.jpg',
      destinationRelativePath: 'private/legacy/client-photo.jpg',
      visibility: 'PRIVATE',
      contentType: 'AUTO',
    };

    const created = await copyAndVerifyMediaFiles(uploadRoot, [operation]);
    const unmapped = await listUnmappedPublicFiles(uploadRoot, [operation]);
    expect(unmapped).toEqual(['public/client-photo.jpg']);
    const moves = await quarantineUnmappedPublicFiles(uploadRoot, [operation]);

    expect(await exists(legacyPath)).toBe(false);
    expect(
      await fs.readFile(
        path.join(uploadRoot, 'private/legacy/public-root/client-photo.jpg'),
      ),
    ).toEqual(legacyBytes);
    await restoreQuarantinedPublicFiles(uploadRoot, moves);
    await cleanupMediaMigrationFiles(uploadRoot, created);

    expect(await fs.readFile(legacyPath)).toEqual(legacyBytes);
    expect(
      await exists(path.join(uploadRoot, 'private/legacy/client-photo.jpg')),
    ).toBe(false);
  });

  it('rejects symlinks anywhere under the future public static root', async () => {
    await fs.mkdir(path.join(uploadRoot, 'public'), { recursive: true });
    const target = await writeSource(
      'legacy/client.jpg',
      Buffer.from('private'),
    );
    await fs.symlink(target, path.join(uploadRoot, 'public/client.jpg'));

    await expect(listUnmappedPublicFiles(uploadRoot, [])).rejects.toThrow(
      'Simbolička veza nije dozvoljena u javnom root-u.',
    );
  });

  it('does not clean a path reached through a symlinked parent directory', async () => {
    const outsideDirectory = path.join(uploadRoot, 'outside');
    const externalFile = path.join(outsideDirectory, 'unexpected.pdf');
    await fs.mkdir(outsideDirectory, { recursive: true });
    await fs.writeFile(externalFile, Buffer.from('must remain'));
    await fs.symlink(outsideDirectory, path.join(uploadRoot, 'private'), 'dir');

    await expect(
      cleanupMediaMigrationFiles(uploadRoot, ['private/unexpected.pdf']),
    ).rejects.toThrow('Migracijske kopije ili quarantine putanje');
    expect(await fs.readFile(externalFile, 'utf8')).toBe('must remain');
  });

  it('cleans only the explicitly returned migrated destinations', async () => {
    await writeSource('legacy/private.pdf', Buffer.from('%PDF-1.4'));
    const operation: MediaCopyOperation = {
      sourceRelativePath: 'legacy/private.pdf',
      destinationRelativePath: 'private/legacy/private.pdf',
      visibility: 'PRIVATE',
      contentType: 'AUTO',
    };
    const copied = await copyAndVerifyMediaFiles(uploadRoot, [operation]);

    await cleanupMediaMigrationFiles(uploadRoot, copied);

    expect(
      await exists(path.join(uploadRoot, 'private/legacy/private.pdf')),
    ).toBe(false);
    expect(await exists(path.join(uploadRoot, 'legacy/private.pdf'))).toBe(
      true,
    );
  });
});
