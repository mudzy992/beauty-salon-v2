import {
  extractPublishedBlogMediaPaths,
  getPublicGalleryUploadIds,
  normalizeStoredMediaPath,
  planMediaStorageMigration,
  rewriteBlogContentMediaPaths,
  type MediaMigrationInventory,
} from './media-storage-migration';

describe('media storage migration planning', () => {
  it('normalizes only safe local paths and rejects traversal and unknown extensions', () => {
    expect(
      normalizeStoredMediaPath('/uploads/services/hero%20image.webp?v=2'),
    ).toBe('uploads/services/hero image.webp');
    expect(
      normalizeStoredMediaPath('https://cdn.example.test/a.png'),
    ).toBeNull();
    expect(normalizeStoredMediaPath('../private/client.jpg')).toBeNull();
    expect(normalizeStoredMediaPath('private/client.html')).toBeNull();
  });

  it('recognizes only category-bound public gallery assets from the dedicated path', () => {
    expect(
      getPublicGalleryUploadIds([
        {
          uploadId: 'manual-gallery-asset',
          upload: {
            storageClass: 'PUBLIC',
            pathOriginal: 'gallery/2026/10/asset.webp',
          },
        },
        {
          uploadId: 'legacy-gallery-path',
          upload: {
            storageClass: 'PUBLIC',
            pathOriginal: 'uploads/gallery/client-photo.jpg',
          },
        },
        {
          uploadId: 'private-gallery-asset',
          upload: {
            storageClass: 'PRIVATE',
            pathOriginal: 'gallery/2026/10/private.webp',
          },
        },
      ]),
    ).toEqual(['manual-gallery-asset']);
  });

  it('extracts only local upload images from published blog markup', () => {
    expect(
      extractPublishedBlogMediaPaths(
        '<img src="/uploads/blog/hero.webp"><img src="https://cdn.example.test/x.png"><img src="/uploads/../private/a.jpg">',
      ),
    ).toEqual(['blog/hero.webp']);
  });

  it('rewrites private embedded image paths while preserving public ones', () => {
    const content =
      '<img src="/uploads/blog/private.jpg"><img src="/uploads/blog/public.jpg">';
    const rewritten = rewriteBlogContentMediaPaths(
      content,
      new Map([
        ['blog/private.jpg', 'private/legacy/direct/private.jpg'],
        ['blog/public.jpg', 'blog/public.jpg'],
      ]),
    );
    expect(rewritten).toBe(
      '<img src="/uploads/private/legacy/direct/private.jpg"><img src="/uploads/blog/public.jpg">',
    );
  });

  it('keeps legacy uploads private unless an explicit public reference exists', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'client-upload',
          storageClass: 'PRIVATE',
          pathOriginal: 'uploads/client.jpg',
          pathThumb: 'uploads/client-thumb.webp',
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: [],
      publicReferences: [],
      privateReferences: [],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toEqual([]);
    expect(plan.uploadUpdates).toEqual([
      expect.objectContaining({
        id: 'client-upload',
        storageClass: 'PRIVATE',
        pathOriginal: 'private/legacy/client-upload/file-original.jpg',
        pathThumb: 'private/legacy/client-upload/file-thumb.webp',
      }),
    ]);
    expect(
      plan.operations.every((operation) => operation.visibility === 'PRIVATE'),
    ).toBe(true);
  });

  it('keeps an allowlisted public upload public when it has no private references', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'service-image',
          storageClass: 'PRIVATE',
          pathOriginal: 'uploads/services/hero.jpg',
          pathThumb: null,
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: [],
      publicReferences: [
        {
          entity: 'APP_SETTING',
          recordId: 'public-home',
          field: 'value',
          value: 'uploads/services/hero.jpg',
          visibility: 'PUBLIC',
        },
      ],
      privateReferences: [],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toEqual([]);
    expect(plan.uploadUpdates[0]).toMatchObject({
      storageClass: 'PUBLIC',
      pathOriginal: 'uploads/services/hero.jpg',
    });
    expect(plan.operations).toContainEqual(
      expect.objectContaining({
        sourceRelativePath: 'uploads/services/hero.jpg',
        destinationRelativePath: 'public/uploads/services/hero.jpg',
        visibility: 'PUBLIC',
      }),
    );
  });

  it('does not preserve a PUBLIC label for a GalleryImage upload without an allowlisted reference', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'gallery-client-image',
          storageClass: 'PUBLIC',
          pathOriginal: 'uploads/gallery/client-photo.jpg',
          pathThumb: null,
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: [],
      publicReferences: [],
      privateReferences: [],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toEqual([]);
    expect(plan.uploadUpdates).toEqual([
      expect.objectContaining({
        id: 'gallery-client-image',
        storageClass: 'PRIVATE',
        pathOriginal: 'private/legacy/gallery-client-image/file-original.jpg',
      }),
    ]);
    expect(plan.operations).toEqual([
      expect.objectContaining({
        sourceRelativePath: 'uploads/gallery/client-photo.jpg',
        destinationRelativePath:
          'private/legacy/gallery-client-image/file-original.jpg',
        visibility: 'PRIVATE',
      }),
    ]);
  });

  it('preserves a new category-bound non-client Gallery upload as public', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'manual-gallery-asset',
          storageClass: 'PUBLIC',
          pathOriginal: 'gallery/2026/10/asset.webp',
          pathThumb: 'gallery/2026/10/asset-thumb.webp',
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: [],
      publicUploadIds: ['manual-gallery-asset'],
      publicReferences: [],
      privateReferences: [],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toEqual([]);
    expect(plan.uploadUpdates).toEqual([
      expect.objectContaining({
        id: 'manual-gallery-asset',
        storageClass: 'PUBLIC',
        pathOriginal: 'gallery/2026/10/asset.webp',
      }),
    ]);
    expect(plan.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRelativePath: 'gallery/2026/10/asset.webp',
          destinationRelativePath: 'public/gallery/2026/10/asset.webp',
          visibility: 'PUBLIC',
        }),
        expect.objectContaining({
          sourceRelativePath: 'gallery/2026/10/asset-thumb.webp',
          destinationRelativePath: 'public/gallery/2026/10/asset-thumb.webp',
          visibility: 'PUBLIC',
        }),
      ]),
    );
  });

  it('maps a legacy entity=public client upload to private storage', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'legacy-public-entity-upload',
          storageClass: 'PRIVATE',
          pathOriginal: 'public/client-photo.jpg',
          pathThumb: null,
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: ['legacy-public-entity-upload'],
      publicReferences: [],
      privateReferences: [],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toEqual([]);
    expect(plan.uploadUpdates[0]).toMatchObject({
      storageClass: 'PRIVATE',
      pathOriginal:
        'private/legacy/legacy-public-entity-upload/file-original.jpg',
    });
    expect(plan.operations).toContainEqual(
      expect.objectContaining({
        sourceRelativePath: 'public/client-photo.jpg',
        destinationRelativePath:
          'private/legacy/legacy-public-entity-upload/file-original.jpg',
        visibility: 'PRIVATE',
      }),
    );
    expect(
      plan.operations.some(({ visibility }) => visibility === 'PUBLIC'),
    ).toBe(false);
  });

  it('flags externally hosted avatars for owner review instead of leaving them public', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [],
      privateUploadIds: [],
      publicReferences: [],
      privateReferences: [
        {
          entity: 'USER',
          recordId: 'user-remote',
          field: 'avatar',
          value: 'https://avatars.example.test/user-1.png',
          visibility: 'PRIVATE',
        },
      ],
    };

    expect(planMediaStorageMigration(inventory).invalidReferences).toContain(
      'USER',
    );
  });

  it('rejects shared paths that have both public and private uses', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'shared-image',
          storageClass: 'PRIVATE',
          pathOriginal: 'uploads/shared.jpg',
          pathThumb: null,
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: ['shared-image'],
      publicReferences: [
        {
          entity: 'APP_SETTING',
          recordId: 'public-home',
          field: 'value',
          value: 'uploads/shared.jpg',
          visibility: 'PUBLIC',
        },
      ],
      privateReferences: [],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toContain('uploads/shared.jpg');
  });

  it('rewrites an avatar path through the private mapping and never promotes it', () => {
    const inventory: MediaMigrationInventory = {
      uploads: [
        {
          id: 'avatar-upload',
          storageClass: 'PRIVATE',
          pathOriginal: 'avatars/source.jpg',
          pathThumb: 'avatars/thumb.webp',
          pathSmall: null,
          pathMedium: null,
        },
      ],
      privateUploadIds: ['avatar-upload'],
      publicReferences: [],
      privateReferences: [
        {
          entity: 'USER',
          recordId: 'user-1',
          field: 'avatar',
          value: 'avatars/thumb.webp',
          visibility: 'PRIVATE',
        },
      ],
    };

    const plan = planMediaStorageMigration(inventory);
    expect(plan.conflicts).toEqual([]);
    expect(plan.directUpdates).toEqual([
      {
        entity: 'USER',
        recordId: 'user-1',
        field: 'avatar',
        value: 'private/legacy/avatar-upload/file-thumb.webp',
      },
    ]);
    expect(plan.uploadUpdates[0]?.storageClass).toBe('PRIVATE');
  });
});
