import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  PrismaClient,
  AppReleaseStatus,
  UploadStorageClass,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  extractPublishedBlogMediaPaths,
  getPublicGalleryUploadIds,
  normalizeStoredMediaPath,
  planMediaStorageMigration,
  rewriteBlogContentMediaPaths,
  type DirectMediaReference,
  type MediaMigrationInventory,
  type MediaMigrationPlan,
} from './media-storage-migration';
import {
  MediaMigrationCleanupError,
  cleanupMediaMigrationFiles,
  copyAndVerifyMediaFiles,
  listUnmappedPublicFiles,
  preflightMediaCopyOperations,
  quarantineUnmappedPublicFiles,
  resolveMediaStoragePath,
  restoreQuarantinedPublicFiles,
} from './media-storage-migration-files';

const PUBLIC_IMAGE_SETTINGS = new Set([
  'app_logo',
  'seo_og_image',
  'public_hero_image',
  'public_about_image',
  'public_contact_bg',
  'public_reserve_bg',
  'public_services_bg',
  'public_gallery_bg',
  'public_blog_bg',
  'public_login_image',
  'public_register_image',
]);

const isApply = process.argv.includes('--apply');
const isDryRun = process.argv.includes('--dry-run');
const hasBackupAcknowledgement = process.argv.includes(
  '--ack-backup-and-rollback',
);

if (isApply && isDryRun) {
  throw new Error('Koristite ili --dry-run ili --apply, ne oba argumenta.');
}
if (isApply && !hasBackupAcknowledgement) {
  throw new Error('Za --apply je obavezan --ack-backup-and-rollback.');
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL nije postavljen.');

const uploadRoot = path.resolve(
  process.env.UPLOAD_ROOT || path.join(process.cwd(), 'uploads'),
);
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

type BlogSnapshot = { id: string; content: string; isPublished: boolean };
type LegacyPrivateUploadCreateData = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pathOriginal: string;
  pathThumb: null;
  pathSmall: null;
  pathMedium: null;
  storageClass: UploadStorageClass;
  uploadedById: string | null;
};

function imageReference(
  entity: DirectMediaReference['entity'],
  recordId: string,
  field: DirectMediaReference['field'],
  value: string | null | undefined,
  visibility: 'PUBLIC' | 'PRIVATE',
): DirectMediaReference | null {
  if (!value?.trim()) return null;
  return { entity, recordId, field, value, visibility, contentType: 'IMAGE' };
}

function isLikelyLocalMediaValue(value: string): boolean {
  return /\.(?:jpe?g|png|webp|gif|svg|apk|pdf|docx?|xlsx?)(?:[?#].*)?$/i.test(
    value.trim(),
  );
}

async function loadInventory(): Promise<{
  inventory: MediaMigrationInventory;
  blogs: BlogSnapshot[];
}> {
  const [
    uploads,
    dailyLogImages,
    expenseAttachments,
    expenses,
    galleryImages,
    users,
    salonSettings,
    services,
    blogPosts,
    settings,
    releases,
  ] = await Promise.all([
    prisma.upload.findMany({
      select: {
        id: true,
        storageClass: true,
        pathOriginal: true,
        pathThumb: true,
        pathSmall: true,
        pathMedium: true,
      },
    }),
    prisma.dailyLogImage.findMany({ select: { uploadId: true } }),
    prisma.expenseAttachment.findMany({ select: { uploadId: true } }),
    prisma.expense.findMany({
      where: { invoiceUploadId: { not: null } },
      select: { invoiceUploadId: true },
    }),
    prisma.galleryImage.findMany({
      select: {
        uploadId: true,
        upload: { select: { storageClass: true, pathOriginal: true } },
      },
    }),
    prisma.user.findMany({
      where: { avatar: { not: null } },
      select: { id: true, avatar: true },
    }),
    prisma.salonSettings.findMany({
      where: { logo: { not: null } },
      select: { id: true, logo: true },
    }),
    prisma.service.findMany({
      where: { heroImage: { not: null } },
      select: { id: true, heroImage: true, isActive: true },
    }),
    prisma.blogPost.findMany({
      select: {
        id: true,
        content: true,
        isPublished: true,
        heroImage: true,
        ogImage: true,
      },
    }),
    prisma.appSetting.findMany({
      select: { id: true, key: true, value: true },
    }),
    prisma.appRelease.findMany({
      select: {
        id: true,
        status: true,
        publishedAt: true,
        apkPath: true,
        apkSha256: true,
        apkSizeBytes: true,
      },
    }),
  ]);

  const privateUploadIds = new Set<string>();
  dailyLogImages.forEach(({ uploadId }) => privateUploadIds.add(uploadId));
  expenseAttachments.forEach(({ uploadId }) => privateUploadIds.add(uploadId));
  expenses.forEach(({ invoiceUploadId }) => {
    if (invoiceUploadId) privateUploadIds.add(invoiceUploadId);
  });
  galleryImages.forEach(({ uploadId, upload }) => {
    if (upload.storageClass === UploadStorageClass.PRIVATE) {
      privateUploadIds.add(uploadId);
    }
  });

  const publicReferences: DirectMediaReference[] = [];
  const privateReferences: DirectMediaReference[] = [];
  const add = (
    target: DirectMediaReference[],
    reference: DirectMediaReference | null,
  ) => {
    if (reference) target.push(reference);
  };

  users.forEach(({ id, avatar }) =>
    add(
      privateReferences,
      imageReference('USER', id, 'avatar', avatar, 'PRIVATE'),
    ),
  );
  salonSettings.forEach(({ id, logo }) =>
    add(
      publicReferences,
      imageReference('SALON_SETTINGS', id, 'logo', logo, 'PUBLIC'),
    ),
  );
  services.forEach(({ id, heroImage, isActive }) =>
    add(
      isActive ? publicReferences : privateReferences,
      imageReference(
        'SERVICE',
        id,
        'heroImage',
        heroImage,
        isActive ? 'PUBLIC' : 'PRIVATE',
      ),
    ),
  );

  const blogs: BlogSnapshot[] = blogPosts.map(
    ({ id, content, isPublished }) => ({
      id,
      content,
      isPublished,
    }),
  );
  blogPosts.forEach(({ id, content, isPublished, heroImage, ogImage }) => {
    const target = isPublished ? publicReferences : privateReferences;
    const visibility = isPublished ? 'PUBLIC' : 'PRIVATE';
    add(
      target,
      imageReference('BLOG_POST', id, 'heroImage', heroImage, visibility),
    );
    add(
      target,
      imageReference('BLOG_POST', id, 'ogImage', ogImage, visibility),
    );
    const contentPaths = extractPublishedBlogMediaPaths(content);
    contentPaths.forEach((value) =>
      target.push({
        entity: 'BLOG_POST',
        recordId: id,
        field: 'content',
        value,
        visibility,
        contentType: 'IMAGE',
      }),
    );
  });

  settings.forEach(({ id, key, value }) => {
    const isPublicAsset = PUBLIC_IMAGE_SETTINGS.has(key);
    if (isPublicAsset) {
      add(
        publicReferences,
        imageReference('APP_SETTING', id, 'value', value, 'PUBLIC'),
      );
    } else if (isLikelyLocalMediaValue(value)) {
      add(
        privateReferences,
        imageReference('APP_SETTING', id, 'value', value, 'PRIVATE'),
      );
    }
  });

  releases.forEach((release) => {
    const wasReleased =
      release.status === AppReleaseStatus.PUBLISHED ||
      (release.status === AppReleaseStatus.RETIRED &&
        release.publishedAt !== null);
    const reference: DirectMediaReference = {
      entity: 'APP_RELEASE',
      recordId: release.id,
      field: 'apkPath',
      value: release.apkPath,
      visibility: wasReleased ? 'PUBLIC' : 'PRIVATE',
      contentType: 'APK',
      expectedSha256: release.apkSha256,
      expectedSizeBytes: release.apkSizeBytes,
    };
    (wasReleased ? publicReferences : privateReferences).push(reference);
  });

  return {
    inventory: {
      uploads,
      privateUploadIds: [...privateUploadIds],
      publicUploadIds: getPublicGalleryUploadIds(galleryImages),
      publicReferences,
      privateReferences,
    },
    blogs,
  };
}

function detectPrivateMimeType(buffer: Buffer, filePath: string): string {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (
    buffer
      .subarray(0, 6)
      .toString('ascii')
      .match(/^GIF8[79]a$/)
  )
    return 'image/gif';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  const extension = path.extname(filePath).toLowerCase();
  if (
    extension === '.svg' &&
    /<svg[\s>]/i.test(buffer.toString('utf8', 0, 2048))
  ) {
    return 'image/svg+xml';
  }
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return 'application/octet-stream';
}

async function applyDatabaseMapping(
  plan: MediaMigrationPlan,
  blogs: BlogSnapshot[],
  inventory: MediaMigrationInventory,
): Promise<void> {
  const pathMappings = new Map(
    plan.pathMappings.map(({ from, to }) => [from, to]),
  );
  const changedBlogContents = blogs
    .filter((blog) => !blog.isPublished)
    .flatMap((blog) => {
      const content = rewriteBlogContentMediaPaths(blog.content, pathMappings);
      return content === blog.content ? [] : [{ id: blog.id, content }];
    });
  const uploadSourcePaths = new Set(
    inventory.uploads.flatMap((upload) =>
      [
        upload.pathOriginal,
        upload.pathThumb,
        upload.pathSmall,
        upload.pathMedium,
      ]
        .map(normalizeStoredMediaPath)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const privateStandalonePaths = new Set(
    inventory.privateReferences
      .filter((reference) => reference.entity !== 'APP_RELEASE')
      .map((reference) => normalizeStoredMediaPath(reference.value))
      .filter((value): value is string => Boolean(value)),
  );
  const legacyUploadRows: LegacyPrivateUploadCreateData[] = [];
  for (const mapping of plan.pathMappings) {
    if (
      !mapping.to.startsWith('private/legacy/direct/') ||
      mapping.from === mapping.to ||
      !privateStandalonePaths.has(mapping.from) ||
      uploadSourcePaths.has(mapping.from)
    ) {
      continue;
    }
    const absolutePath = resolveMediaStoragePath(uploadRoot, mapping.to);
    const buffer = await fs.readFile(absolutePath);
    if (buffer.length > 2_147_483_647) {
      throw new Error('Privatni fajl premašuje DB ograničenje veličine.');
    }
    const ownerReference = inventory.privateReferences.find(
      (reference) =>
        reference.entity === 'USER' &&
        normalizeStoredMediaPath(reference.value) === mapping.from,
    );
    legacyUploadRows.push({
      originalName: `legacy-private${path.extname(mapping.to).toLowerCase()}`,
      mimeType: detectPrivateMimeType(buffer, mapping.to),
      sizeBytes: buffer.length,
      pathOriginal: mapping.to,
      pathThumb: null,
      pathSmall: null,
      pathMedium: null,
      storageClass: UploadStorageClass.PRIVATE,
      uploadedById: ownerReference?.recordId ?? null,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const upload of legacyUploadRows) {
      await tx.upload.create({ data: upload });
    }
    for (const update of plan.uploadUpdates) {
      await tx.upload.update({
        where: { id: update.id },
        data: {
          storageClass: update.storageClass as UploadStorageClass,
          pathOriginal: update.pathOriginal,
          pathThumb: update.pathThumb,
          pathSmall: update.pathSmall,
          pathMedium: update.pathMedium,
        },
      });
    }
    for (const update of plan.directUpdates) {
      if (update.entity === 'USER' && update.field === 'avatar') {
        await tx.user.update({
          where: { id: update.recordId },
          data: { avatar: update.value },
        });
      } else if (update.entity === 'APP_SETTING' && update.field === 'value') {
        await tx.appSetting.update({
          where: { id: update.recordId },
          data: { value: update.value },
        });
      } else if (
        update.entity === 'APP_RELEASE' &&
        update.field === 'apkPath'
      ) {
        await tx.appRelease.update({
          where: { id: update.recordId },
          data: { apkPath: update.value },
        });
      } else if (update.entity === 'SERVICE' && update.field === 'heroImage') {
        await tx.service.update({
          where: { id: update.recordId },
          data: { heroImage: update.value },
        });
      } else if (
        update.entity === 'BLOG_POST' &&
        update.field === 'heroImage'
      ) {
        await tx.blogPost.update({
          where: { id: update.recordId },
          data: { heroImage: update.value },
        });
      } else if (update.entity === 'BLOG_POST' && update.field === 'ogImage') {
        await tx.blogPost.update({
          where: { id: update.recordId },
          data: { ogImage: update.value },
        });
      } else if (
        update.entity === 'SALON_SETTINGS' &&
        update.field === 'logo'
      ) {
        await tx.salonSettings.update({
          where: { id: update.recordId },
          data: { logo: update.value },
        });
      }
    }
    for (const update of changedBlogContents) {
      await tx.blogPost.update({
        where: { id: update.id },
        data: { content: update.content },
      });
    }
  });
}

async function main(): Promise<void> {
  const { inventory, blogs } = await loadInventory();
  const plan = planMediaStorageMigration(inventory);
  const conflictFingerprints = plan.conflicts.map((value) =>
    createHash('sha256').update(value).digest('hex').slice(0, 12),
  );
  const existingUploadPaths = new Set(
    inventory.uploads.flatMap((upload) =>
      [
        upload.pathOriginal,
        upload.pathThumb,
        upload.pathSmall,
        upload.pathMedium,
      ]
        .map(normalizeStoredMediaPath)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const privateStandalonePaths = new Set(
    inventory.privateReferences
      .filter((reference) => reference.entity !== 'APP_RELEASE')
      .map((reference) => normalizeStoredMediaPath(reference.value))
      .filter((value): value is string => Boolean(value)),
  );
  const unmappedPublicFiles = await listUnmappedPublicFiles(
    uploadRoot,
    plan.operations,
  );
  const summary = {
    uploads: inventory.uploads.length,
    publicDirectReferences: inventory.publicReferences.length,
    privateDirectReferences: inventory.privateReferences.length,
    copyOperations: plan.operations.length,
    legacyPublicFilesToQuarantine: unmappedPublicFiles.length,
    uploadRowsToMap: plan.uploadUpdates.length,
    directFieldsToMap: plan.directUpdates.length,
    standalonePrivateUploadRowsToCreate: plan.pathMappings.filter(
      (mapping) =>
        mapping.to.startsWith('private/legacy/direct/') &&
        mapping.from !== mapping.to &&
        privateStandalonePaths.has(mapping.from) &&
        !existingUploadPaths.has(mapping.from),
    ).length,
    pathConflicts: plan.conflicts.length,
    invalidReferences: plan.invalidReferences.length,
  };
  console.info(`SEC-04/PRIV-01 media inventory: ${JSON.stringify(summary)}`);
  if (conflictFingerprints.length) {
    console.error(
      `Conflict fingerprints (no paths logged): ${conflictFingerprints.slice(0, 20).join(', ')}`,
    );
  }
  if (plan.conflicts.length || plan.invalidReferences.length) {
    throw new Error(
      'Plan nije siguran za primjenu; razriješite konfliktnu inventuru.',
    );
  }
  await preflightMediaCopyOperations(uploadRoot, plan.operations);
  if (!isApply) {
    console.info('Dry-run je završen; nije promijenjen DB niti filesystem.');
    return;
  }

  const createdFiles: string[] = [];
  let quarantinedPublicFiles: Awaited<
    ReturnType<typeof quarantineUnmappedPublicFiles>
  > = [];
  try {
    createdFiles.push(
      ...(await copyAndVerifyMediaFiles(uploadRoot, plan.operations)),
    );
    quarantinedPublicFiles = await quarantineUnmappedPublicFiles(
      uploadRoot,
      plan.operations,
    );
    await applyDatabaseMapping(plan, blogs, inventory);
  } catch (error) {
    let cleanupFailed = false;
    try {
      await restoreQuarantinedPublicFiles(uploadRoot, quarantinedPublicFiles);
    } catch {
      cleanupFailed = true;
    }
    try {
      await cleanupMediaMigrationFiles(uploadRoot, createdFiles);
    } catch {
      cleanupFailed = true;
    }
    if (cleanupFailed) throw new MediaMigrationCleanupError();
    throw error;
  }
  console.info(
    'Migracija je završena; legacy datoteke su sačuvane, a nemapirane datoteke iz javnog root-a premještene su u privatni quarantine.',
  );
}

main()
  .catch((error: unknown) => {
    // Avoid exposing paths, filenames, DB URLs, or personal data through CI/logs.
    if (error instanceof MediaMigrationCleanupError) {
      console.error(
        'Media migration cleanup is incomplete. Stop the rollout and inspect the destination volume; filenames are intentionally omitted.',
      );
    } else {
      const name = error instanceof Error ? error.name : 'Error';
      console.error(
        `Media migration stopped (${name}); no production claim is implied.`,
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
