import * as path from 'path';
import { createHash } from 'crypto';

export type MediaStorageClass = 'PRIVATE' | 'PUBLIC' | 'CONSENTED_PUBLIC';
export type MigrationVisibility = 'PRIVATE' | 'PUBLIC';
export type MigrationContentType = 'IMAGE' | 'APK' | 'AUTO';

export interface LegacyUploadRow {
  id: string;
  storageClass: MediaStorageClass;
  pathOriginal: string;
  pathThumb: string | null;
  pathSmall: string | null;
  pathMedium: string | null;
}

export interface DirectMediaReference {
  entity:
    | 'USER'
    | 'APP_SETTING'
    | 'APP_RELEASE'
    | 'SERVICE'
    | 'BLOG_POST'
    | 'SALON_SETTINGS';
  recordId: string;
  field:
    | 'avatar'
    | 'value'
    | 'apkPath'
    | 'heroImage'
    | 'ogImage'
    | 'logo'
    | 'content';
  value: string;
  visibility: MigrationVisibility;
  contentType?: MigrationContentType;
  expectedSha256?: string;
  expectedSizeBytes?: number;
}

export interface MediaMigrationInventory {
  uploads: LegacyUploadRow[];
  privateUploadIds: string[];
  /** New, category-bound non-client Gallery assets may remain public. */
  publicUploadIds?: string[];
  publicReferences: DirectMediaReference[];
  privateReferences: DirectMediaReference[];
}

export function getPublicGalleryUploadIds(
  galleryImages: Array<{
    uploadId: string;
    upload: Pick<LegacyUploadRow, 'storageClass' | 'pathOriginal'>;
  }>,
): string[] {
  const uploadIds = new Set<string>();
  for (const { uploadId, upload } of galleryImages) {
    const pathOriginal = normalizeStoredMediaPath(upload.pathOriginal);
    if (
      upload.storageClass === 'PUBLIC' &&
      pathOriginal?.startsWith('gallery/')
    ) {
      uploadIds.add(uploadId);
    }
  }
  return [...uploadIds];
}

export interface MediaCopyOperation {
  sourceRelativePath: string;
  destinationRelativePath: string;
  visibility: MigrationVisibility;
  contentType: MigrationContentType;
  expectedSha256?: string;
  expectedSizeBytes?: number;
}

export interface UploadMigrationUpdate {
  id: string;
  storageClass: Exclude<MediaStorageClass, 'CONSENTED_PUBLIC'>;
  pathOriginal: string;
  pathThumb: string | null;
  pathSmall: string | null;
  pathMedium: string | null;
}

export interface DirectMigrationUpdate {
  entity: DirectMediaReference['entity'];
  recordId: string;
  field: DirectMediaReference['field'];
  value: string;
}

export interface MediaMigrationPlan {
  operations: MediaCopyOperation[];
  uploadUpdates: UploadMigrationUpdate[];
  directUpdates: DirectMigrationUpdate[];
  pathMappings: Array<{ from: string; to: string }>;
  conflicts: string[];
  invalidReferences: string[];
}

const UPLOAD_FIELDS = [
  ['pathOriginal', 'original'],
  ['pathThumb', 'thumb'],
  ['pathSmall', 'small'],
  ['pathMedium', 'medium'],
] as const;

const MEDIA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.apk',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
]);

/**
 * Normalize a stored DB path, not an arbitrary URL. A URL is accepted only when
 * its route contains /uploads/; relative values remain relative to UPLOAD_ROOT.
 */
export function normalizeStoredMediaPath(
  value: string | null | undefined,
): string | null {
  const original = String(value ?? '').trim();
  if (!original || /^(data:|blob:|javascript:)/i.test(original)) return null;

  let normalized = original.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const pathname = new URL(normalized).pathname;
      const marker = '/uploads/';
      const index = pathname.indexOf(marker);
      if (index < 0) return null;
      normalized = pathname.slice(index + marker.length);
    } catch {
      return null;
    }
  } else {
    normalized = normalized.split(/[?#]/, 1)[0] ?? '';
    normalized = normalized.replace(/^\/+/, '');
  }

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    return null;
  }
  normalized = normalized.replace(/\\/g, '/');
  if (
    !normalized ||
    normalized.includes('\0') ||
    path.posix.isAbsolute(normalized)
  ) {
    return null;
  }
  const safe = path.posix.normalize(normalized);
  if (safe === '.' || safe === '..' || safe.startsWith('../')) return null;
  if (!MEDIA_EXTENSIONS.has(path.posix.extname(safe).toLowerCase()))
    return null;
  return safe;
}

function normalizeBlogMediaSource(raw: string): string | null {
  let value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return null;
    }
  }
  if (value.startsWith('/uploads/')) {
    value = value.slice('/uploads/'.length);
  } else if (value.startsWith('uploads/')) {
    value = value.slice('uploads/'.length);
  } else {
    return null;
  }
  return normalizeStoredMediaPath(value);
}

/** Extract only local /uploads/* image sources from published blog HTML. */
export function extractPublishedBlogMediaPaths(content: string): string[] {
  const result = new Set<string>();
  const sourcePattern = /\bsrc\s*=\s*(["'])(.*?)\1/gi;
  for (const match of content.matchAll(sourcePattern)) {
    const normalized = normalizeBlogMediaSource(match[2] ?? '');
    if (normalized) result.add(normalized);
  }
  return [...result];
}

/** Rewrite embedded local image URLs whose files moved under private storage. */
export function rewriteBlogContentMediaPaths(
  content: string,
  mappings: ReadonlyMap<string, string>,
): string {
  const sourcePattern = /\bsrc\s*=\s*(["'])(.*?)\1/gi;
  return content.replace(
    sourcePattern,
    (attribute, quote: string, raw: string) => {
      const sourcePath = normalizeBlogMediaSource(raw);
      if (!sourcePath) return attribute;
      const destination = mappings.get(sourcePath);
      if (!destination || destination === sourcePath) return attribute;
      return `src=${quote}/uploads/${destination}${quote}`;
    },
  );
}

function safeUploadSegment(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function safeExtension(value: string): string {
  return path.posix.extname(value).toLowerCase() || '.bin';
}

function directPrivateDestination(sourcePath: string): string {
  const extension = safeExtension(sourcePath);
  const fingerprint = createHash('sha256')
    .update(sourcePath)
    .digest('hex')
    .slice(0, 20);
  return `private/legacy/direct/${fingerprint}${extension}`;
}

function publicContentType(
  explicit: MigrationContentType | undefined,
  filePath: string,
): MigrationContentType {
  if (explicit && explicit !== 'AUTO') return explicit;
  return path.posix.extname(filePath).toLowerCase() === '.apk'
    ? 'APK'
    : 'IMAGE';
}

export function planMediaStorageMigration(
  inventory: MediaMigrationInventory,
): MediaMigrationPlan {
  const conflicts = new Set<string>();
  const invalidReferences = new Set<string>();
  const publicPaths = new Set<string>();
  const privatePaths = new Set<string>();
  const addReference = (
    reference: DirectMediaReference,
    visibility: MigrationVisibility,
  ) => {
    const normalized = normalizeStoredMediaPath(reference.value);
    if (!normalized) {
      const isRemoteAvatar =
        reference.entity === 'USER' &&
        /^https?:\/\//i.test(reference.value.trim());
      if (
        reference.value.trim() &&
        (isRemoteAvatar || !/^https?:\/\//i.test(reference.value.trim()))
      ) {
        invalidReferences.add(reference.entity);
      }
      return;
    }
    const target = visibility === 'PUBLIC' ? publicPaths : privatePaths;
    target.add(normalized);
  };

  for (const reference of inventory.publicReferences) {
    addReference(reference, 'PUBLIC');
  }
  for (const reference of inventory.privateReferences) {
    addReference(reference, 'PRIVATE');
  }

  const privateUploadIds = new Set(inventory.privateUploadIds);
  const publicUploadIds = new Set(inventory.publicUploadIds ?? []);
  const uploadPaths = new Map<string, Set<string>>();
  for (const upload of inventory.uploads) {
    const paths = new Set<string>();
    for (const [field] of UPLOAD_FIELDS) {
      const value = upload[field];
      const normalized = normalizeStoredMediaPath(value);
      if (normalized) paths.add(normalized);
    }
    uploadPaths.set(upload.id, paths);
    if (upload.storageClass === 'CONSENTED_PUBLIC') {
      paths.forEach((filePath) => privatePaths.add(filePath));
      continue;
    }
    if (privateUploadIds.has(upload.id)) {
      paths.forEach((filePath) => privatePaths.add(filePath));
    }
  }

  for (const filePath of publicPaths) {
    if (privatePaths.has(filePath)) conflicts.add(filePath);
  }

  const pathMap = new Map<string, string>();
  const operationsByDestination = new Map<string, MediaCopyOperation>();
  const uploadUpdates: UploadMigrationUpdate[] = [];
  const assignedUploadPath = new Map<string, string>();

  const addOperation = (operation: MediaCopyOperation) => {
    const existing = operationsByDestination.get(
      operation.destinationRelativePath,
    );
    if (existing) {
      if (
        existing.sourceRelativePath !== operation.sourceRelativePath ||
        existing.visibility !== operation.visibility
      ) {
        conflicts.add(operation.destinationRelativePath);
      }
      if (
        existing.expectedSha256 &&
        operation.expectedSha256 &&
        existing.expectedSha256.toLowerCase() !==
          operation.expectedSha256.toLowerCase()
      ) {
        conflicts.add(operation.destinationRelativePath);
      }
      return;
    }
    operationsByDestination.set(operation.destinationRelativePath, operation);
  };

  for (const upload of inventory.uploads) {
    if (upload.storageClass === 'CONSENTED_PUBLIC') continue;
    const paths = uploadPaths.get(upload.id) ?? new Set<string>();
    const hasPublicUse =
      publicUploadIds.has(upload.id) ||
      [...paths].some((filePath) => publicPaths.has(filePath));
    const hasPrivateUse =
      privateUploadIds.has(upload.id) ||
      [...paths].some((filePath) => privatePaths.has(filePath));
    if (hasPublicUse && hasPrivateUse) {
      paths.forEach((filePath) => conflicts.add(filePath));
      continue;
    }
    const storageClass: 'PRIVATE' | 'PUBLIC' = hasPublicUse
      ? 'PUBLIC'
      : 'PRIVATE';
    const next: UploadMigrationUpdate = {
      id: upload.id,
      storageClass,
      pathOriginal: upload.pathOriginal,
      pathThumb: upload.pathThumb,
      pathSmall: upload.pathSmall,
      pathMedium: upload.pathMedium,
    };
    const perUploadPath = new Map<string, string>();

    for (const [field, variant] of UPLOAD_FIELDS) {
      const originalValue = upload[field];
      if (!originalValue) continue;
      const normalized = normalizeStoredMediaPath(originalValue);
      if (!normalized) {
        invalidReferences.add('UPLOAD');
        continue;
      }
      const currentIsPrivate = normalized.startsWith('private/');
      if (storageClass === 'PUBLIC' && currentIsPrivate) {
        conflicts.add(normalized);
        continue;
      }

      let destination = normalized;
      if (storageClass === 'PRIVATE' && !currentIsPrivate) {
        destination =
          perUploadPath.get(normalized) ??
          `private/legacy/${safeUploadSegment(upload.id)}/file-${variant}${safeExtension(normalized)}`;
        perUploadPath.set(normalized, destination);
      }

      const prior = pathMap.get(normalized);
      if (prior && prior !== destination) conflicts.add(normalized);
      else pathMap.set(normalized, destination);
      if (!(storageClass === 'PRIVATE' && currentIsPrivate)) {
        addOperation({
          sourceRelativePath: normalized,
          destinationRelativePath:
            storageClass === 'PUBLIC' ? `public/${normalized}` : destination,
          visibility: storageClass,
          contentType: 'IMAGE',
        });
      }
      (next as unknown as Record<string, string | null>)[field] = destination;
    }
    uploadUpdates.push(next);
  }

  for (const reference of [
    ...inventory.publicReferences,
    ...inventory.privateReferences,
  ]) {
    const normalized = normalizeStoredMediaPath(reference.value);
    if (!normalized) continue;
    if (reference.visibility === 'PUBLIC') {
      if (
        normalized.startsWith('private/') ||
        normalized.startsWith('consented/')
      ) {
        conflicts.add(normalized);
        continue;
      }
      const mapped = pathMap.get(normalized);
      if (mapped && mapped !== normalized) {
        conflicts.add(normalized);
        continue;
      }
      const isUploadPath = [...uploadPaths.values()].some((paths) =>
        paths.has(normalized),
      );
      if (!isUploadPath) {
        addOperation({
          sourceRelativePath: normalized,
          destinationRelativePath: `public/${normalized}`,
          visibility: 'PUBLIC',
          contentType: publicContentType(reference.contentType, normalized),
          expectedSha256: reference.expectedSha256,
          expectedSizeBytes: reference.expectedSizeBytes,
        });
      }
      continue;
    }

    const mapped = pathMap.get(normalized);
    const destination =
      mapped ??
      (normalized.startsWith('private/')
        ? normalized
        : directPrivateDestination(normalized));
    if (!mapped && !normalized.startsWith('private/')) {
      addOperation({
        sourceRelativePath: normalized,
        destinationRelativePath: destination,
        visibility: 'PRIVATE',
        contentType: publicContentType(reference.contentType, normalized),
        expectedSha256: reference.expectedSha256,
        expectedSizeBytes: reference.expectedSizeBytes,
      });
    }
    const previousMapping = pathMap.get(normalized);
    if (previousMapping && previousMapping !== destination) {
      conflicts.add(normalized);
    } else {
      pathMap.set(normalized, destination);
    }
    if (
      destination !== normalized &&
      !(reference.entity === 'BLOG_POST' && reference.field === 'content')
    ) {
      assignedUploadPath.set(
        `direct:${reference.entity}:${reference.recordId}:${reference.field}`,
        destination,
      );
    }
  }

  const directUpdates: DirectMigrationUpdate[] =
    inventory.privateReferences.flatMap((reference) => {
      if (reference.entity === 'BLOG_POST' && reference.field === 'content')
        return [];
      const normalized = normalizeStoredMediaPath(reference.value);
      if (!normalized) return [];
      const value =
        assignedUploadPath.get(
          `direct:${reference.entity}:${reference.recordId}:${reference.field}`,
        ) ??
        pathMap.get(normalized) ??
        normalized;
      return value === normalized
        ? []
        : [
            {
              entity: reference.entity,
              recordId: reference.recordId,
              field: reference.field,
              value,
            },
          ];
    });

  return {
    operations: [...operationsByDestination.values()],
    uploadUpdates,
    directUpdates,
    pathMappings: [...pathMap].map(([from, to]) => ({ from, to })),
    conflicts: [...conflicts],
    invalidReferences: [...invalidReferences],
  };
}
