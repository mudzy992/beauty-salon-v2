import { ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

const UPLOAD_PATH_REFERENCES = [
  /(?:^|[\s'"=(])\/?(?:uploads\/)?((?:private|public|gallery|brand|service|blog)\/[A-Za-z0-9._/-]+)/gi,
  /https?:\/\/[^/\s'"<>]+\/uploads\/((?:private|public|gallery|brand|service|blog)\/[A-Za-z0-9._/-]+)/gi,
];
const TRAILING_PATH_PUNCTUATION = /[.)\]},;]+$/;

const stringsFrom = (value: unknown, seen = new Set<object>()): string[] => {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  if (Array.isArray(value))
    return value.flatMap((item) => stringsFrom(item, seen));
  return Object.values(value).flatMap((item) => stringsFrom(item, seen));
};

const canonicalPath = (value: string): string =>
  value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^uploads\//i, '');

export const uploadPathsInReferences = (references: unknown[]): string[] => {
  const paths = new Set<string>();
  for (const value of stringsFrom(references)) {
    for (const pattern of UPLOAD_PATH_REFERENCES) {
      pattern.lastIndex = 0;
      for (const match of value.matchAll(pattern)) {
        const candidate = canonicalPath(match[1] ?? '').replace(
          TRAILING_PATH_PUNCTUATION,
          '',
        );
        if (candidate) paths.add(candidate);
      }
    }
  }
  return [...paths].sort();
};

export const lockUploadPathKeys = async (
  tx: Prisma.TransactionClient,
  paths: string[],
): Promise<void> => {
  const canonicalPaths = [
    ...new Set(paths.map(canonicalPath).filter(Boolean)),
  ].sort();
  for (const path of canonicalPaths) {
    const lockKey = `uploads:path:${path}`;
    // Keep the void-returning advisory-lock function inside a materialized CTE;
    // only the boolean projection is decoded by Prisma.
    await tx.$queryRaw<Array<{ locked: boolean }>>`
      WITH acquired AS MATERIALIZED (
        SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
      )
      SELECT true AS locked FROM acquired
    `;
  }
};

export const lockUploadPathReferences = async (
  tx: Prisma.TransactionClient,
  references: unknown[],
): Promise<void> => {
  const paths = uploadPathsInReferences(references);
  if (!paths.length) return;

  await lockUploadPathKeys(tx, paths);
  const variants = Array.from(
    new Set(
      paths.flatMap((path) => [
        path,
        `/${path}`,
        `uploads/${path}`,
        `/uploads/${path}`,
      ]),
    ),
  );
  const rows = await tx.upload.findMany({
    where: {
      OR: [
        { pathOriginal: { in: variants } },
        { pathThumb: { in: variants } },
        { pathSmall: { in: variants } },
        { pathMedium: { in: variants } },
      ],
    },
    select: {
      pathOriginal: true,
      pathThumb: true,
      pathSmall: true,
      pathMedium: true,
    },
  });
  const storedPaths = new Set(
    rows
      .flatMap((row) => [
        row.pathOriginal,
        row.pathThumb,
        row.pathSmall,
        row.pathMedium,
      ])
      .filter((path): path is string => Boolean(path))
      .map(canonicalPath),
  );

  if (paths.some((path) => !storedPaths.has(path))) {
    throw new ConflictException('Upload više nije dostupan za povezivanje.');
  }
};

export const withUploadPathReferenceLocks = async <T>(
  prisma: PrismaService,
  references: unknown[],
  writeWithLocks: (tx: Prisma.TransactionClient) => Promise<T>,
  writeWithoutLocks: () => Promise<T>,
): Promise<T> => {
  if (!uploadPathsInReferences(references).length) return writeWithoutLocks();
  return prisma.$transaction(async (tx) => {
    await lockUploadPathReferences(tx, references);
    return writeWithLocks(tx);
  });
};

export const lockUploadIdReference = async (
  tx: Prisma.TransactionClient,
  uploadId: string | null | undefined,
): Promise<void> => {
  if (!uploadId) return;
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM uploads WHERE id = ${uploadId} FOR KEY SHARE
  `;
  if (!rows.length) {
    throw new ConflictException('Upload više nije dostupan za povezivanje.');
  }
};
