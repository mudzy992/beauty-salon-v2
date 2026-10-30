import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const filename = new URL(relativePath, import.meta.url);
  const source = readFileSync(filename, 'utf8');
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: fileURLToPath(filename),
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  assert.deepEqual(
    (diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
    [],
    `${relativePath} should transpile without TypeScript diagnostics`,
  );
  const loadedModule = { exports: {} };
  new Function('module', 'exports', outputText)(loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const roles = loadTypeScriptModule('../../utils/roles.ts');
const apiError = loadTypeScriptModule('../../utils/apiError.ts');
const uploadUrl = loadTypeScriptModule('../../utils/uploadUrl.ts');
const profileData = loadTypeScriptModule('./profile-data.ts');
const profileSource = readFileSync(new URL('./ProfileScreen.tsx', import.meta.url), 'utf8');
const editProfileSource = readFileSync(new URL('./EditProfileScreen.tsx', import.meta.url), 'utf8');
const backendUsersServiceSource = readFileSync(
  new URL('../../../../backend/src/users/users.service.ts', import.meta.url),
  'utf8',
);
const backendUsersControllerSource = readFileSync(
  new URL('../../../../backend/src/users/users.controller.ts', import.meta.url),
  'utf8',
);
const backendUploadsControllerSource = readFileSync(
  new URL('../../../../backend/src/uploads/uploads.controller.ts', import.meta.url),
  'utf8',
);
const mediaImageSource = readFileSync(new URL('../../components/MediaImage.tsx', import.meta.url), 'utf8');
const uploadsServiceSource = readFileSync(
  new URL('../../../../backend/src/uploads/uploads.service.ts', import.meta.url),
  'utf8',
);
const uploadsRepositorySource = readFileSync(
  new URL('../../../../backend/src/uploads/uploads.repository.ts', import.meta.url),
  'utf8',
);

// Keep this explicit regression fixture aligned with GET /api/users/profile,
// whose backend contract serializes roles as a string array.
test('profile role checks accept the backend roles: string[] response', () => {
  const backendProfile = { id: 'client-1', roles: ['CLIENT'] };
  assert.equal(roles.isClient(backendProfile), true);
  assert.equal(roles.isStylist(backendProfile), false);
  assert.match(backendUsersServiceSource, /roles:\s*user\.userRoles\.map\(\(ur\)\s*=>\s*ur\.role\.name\)/);
  assert.match(profileSource, /userIsClient\(user\)/);
  assert.doesNotMatch(profileSource, /user\??\.roles\.some\([^\n]*item\.role\.name/);
});

test('role normalization safely ignores malformed and null role entries', () => {
  assert.deepEqual(
    roles.getRoleNames({ roles: [null, 42, {}, { role: null }, { role: { name: 'STYLIST' } }, 'CLIENT'] }),
    ['STYLIST', 'CLIENT'],
  );
  assert.equal(roles.isClient(null), false);
});

test('private avatar URLs target the authenticated file endpoint and use the stored token', () => {
  const previousApiUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://api.example.test';
  try {
    assert.equal(
      uploadUrl.getImageUrl('private/avatars/client-thumb.webp'),
      'https://api.example.test/api/uploads/content?path=private%2Favatars%2Fclient-thumb.webp',
    );
  } finally {
    if (previousApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previousApiUrl;
  }

  assert.match(mediaImageSource, /remote\.includes\('\/api\/uploads\/content\?'\) && token/);
  assert.match(mediaImageSource, /Authorization: `Bearer \$\{token\}`/);
  assert.match(mediaImageSource, /cachePolicy=\{isProtected \? 'none' : 'memory-disk'\}/);
  assert.match(uploadsServiceSource, /upload\.uploadedById === currentUser\.sub/);
  assert.match(uploadsServiceSource, /privileged \|\|\s*ownUpload/);
});

test('avatar upload and visibility toggle keep private reads and public opt-in separate', () => {
  assert.match(editProfileSource, /api\.post\('\/api\/users\/profile\/avatar', formData\)/);
  assert.match(editProfileSource, /api\.patch\('\/api\/users\/profile\/avatar-visibility', \{ isAvatarPublic \}\)/);
  assert.match(editProfileSource, /uri=\{getImageUrl\(user\?\.avatar\)\}/);
  assert.match(backendUploadsControllerSource, /@Controller\('api\/uploads'\)\s*@UseGuards\(JwtAuthGuard\)/);
  assert.match(backendUsersControllerSource, /@Get\(':id\/avatar'\)\s*@Public\(\)/);
  assert.match(backendUsersServiceSource, /async setAvatarVisibility\([\s\S]*?if \(isAvatarPublic && user\.avatar\)[\s\S]*?await this\.assertOwnedAvatar\(userId, user\.avatar\)/);
  assert.match(uploadsRepositorySource, /if \(!user\?\.isAvatarPublic \|\| !user\.avatar\) return null/);
  assert.match(uploadsServiceSource, /upload\.storageClass === UploadStorageClass\.PUBLIC/);
});

test('media-consent parser rejects incomplete response envelopes and normalizes bad collections', () => {
  assert.equal(profileData.normalizeConsentPayload(null), null);
  assert.equal(profileData.normalizeConsentPayload({ policyVersion: 'v1', consentText: 'text' }), null);
  assert.equal(
    profileData.normalizeConsentPayload({
      policyVersion: 'v1',
      consentText: 'text',
      pending: {},
      active: [],
    }),
    null,
  );

  const normalized = profileData.normalizeConsentPayload({
    policyVersion: 'v1',
    consentText: 'Policy',
    pending: [
      null,
      {
        imageId: 'pending-1',
        previewUrl: '/api/uploads/content?path=private%2Fdaily-log%2Fbefore.webp',
        publishedCategories: 'invalid',
      },
    ],
    active: [
      {
        imageId: 'active-1',
        serviceName: null,
        serviceDate: 42,
        previewUrl: 'https://untrusted.example/image.png',
        isBefore: true,
        isPublished: true,
        publishedCategories: [{ id: 'cat-1', name: 'Salon' }, null, { id: 4, name: 'bad' }],
      },
    ],
  });

  assert.deepEqual(normalized.pending, [
    {
      imageId: 'pending-1',
      serviceName: '',
      serviceDate: '',
      isBefore: false,
      previewUrl: '/api/uploads/content?path=private%2Fdaily-log%2Fbefore.webp',
      consentedAt: null,
      isPublished: false,
      publishedCategories: [],
    },
  ]);
  assert.equal(normalized.active[0].serviceName, '');
  assert.equal(normalized.active[0].serviceDate, '');
  assert.equal(normalized.active[0].previewUrl, '');
  assert.deepEqual(normalized.active[0].publishedCategories, [{ id: 'cat-1', name: 'Salon' }]);
  assert.equal(normalized.active[0].isPublished, true);
});

test('debt and date formatters accept malformed API values without throwing', () => {
  assert.deepEqual(
    profileData.normalizeProfileDebts([null, {}, { id: 'debt-1', amount: {}, service: 'bad' }]),
    [{ id: 'debt-1', amount: 0, createdAt: '', service: null }],
  );
  assert.equal(profileData.normalizeProfileDebts({ items: [] }), null);
  assert.equal(profileData.formatProfileAmount('not-a-number'), null);
  assert.equal(profileData.formatProfileAmount('12.5'), '12.50');
  assert.equal(profileData.formatProfileDate('', () => { throw new Error('should not run'); }), '');
  assert.equal(profileData.formatProfileDate('2026-99-99', () => { throw new Error('invalid date'); }), '2026-99-99');
});
