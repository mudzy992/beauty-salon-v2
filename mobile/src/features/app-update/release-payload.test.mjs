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
  );
  const loadedModule = { exports: {} };
  new Function('module', 'exports', outputText)(loadedModule, loadedModule.exports);
  return loadedModule.exports;
}

const { MAX_APK_SIZE_BYTES, parseLatestAndroidRelease, resolveApkAbsoluteUrl } =
  loadTypeScriptModule('./release-payload.ts');

const validRelease = {
  version: '2.3.0',
  versionCode: 203,
  minSupportedVersionCode: 180,
  forceUpdate: false,
  apkUrl: '/uploads/app-releases/2026/10/release-a1b2-c3.apk',
  apkSha256: 'A'.repeat(64),
  apkSizeBytes: 12_345,
  releaseNotes: null,
  publishedAt: '2026-10-30T08:00:00.000Z',
};

test('Android release parser accepts the backend DTO and normalizes the SHA-256 value', () => {
  const release = parseLatestAndroidRelease(validRelease);
  assert.equal(release.versionCode, 203);
  assert.equal(release.apkSha256, 'a'.repeat(64));
  assert.equal(release.apkUrl, validRelease.apkUrl);
  assert.equal(parseLatestAndroidRelease(null), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, apkSizeBytes: MAX_APK_SIZE_BYTES + 1 }), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, versionCode: '203' }), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, minSupportedVersionCode: 204 }), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, apkSha256: 'bad' }), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, apkSizeBytes: 0 }), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, publishedAt: 'not-a-date' }), null);
  assert.equal(parseLatestAndroidRelease({ ...validRelease, releaseNotes: {} }), null);
});

test('APK URL resolver accepts only the API origin and a canonical public app-release path', () => {
  const base = 'https://api.example.test';
  assert.equal(
    resolveApkAbsoluteUrl(validRelease.apkUrl, base),
    `https://api.example.test${validRelease.apkUrl}`,
  );
  assert.equal(
    resolveApkAbsoluteUrl(`https://api.example.test${validRelease.apkUrl}`, base),
    `https://api.example.test${validRelease.apkUrl}`,
  );
  for (const url of [
    'https://evil.example/app.apk',
    '//evil.example/uploads/app-releases/2026/10/a.apk',
    '/uploads/private/app-releases/2026/10/a.apk',
    '/uploads/app-releases/2026/10/../../secret.apk',
    '/uploads/app-releases/2026/10/a.apk?redirect=evil',
    'javascript:alert(1)',
  ]) {
    assert.throws(() => resolveApkAbsoluteUrl(url, base), /invalid_apk_url/);
  }
});

test('updater fetch and download paths enforce bounded metadata, timeout, size and hash checks', () => {
  const source = readFileSync(new URL('./apk-update.ts', import.meta.url), 'utf8');
  assert.match(source, /setTimeout\(\(\) => controller\.abort\(\), 10_000\)/);
  assert.match(source, /res\.text\(\)/);
  assert.match(source, /MAX_RELEASE_METADATA_BYTES/);
  assert.match(source, /parseLatestAndroidRelease\(value\)/);
  assert.match(source, /p\.totalBytesWritten > MAX_APK_SIZE_BYTES/);
  assert.match(source, /downloadedInfo\.size !== safeRelease\.apkSizeBytes/);
  assert.match(source, /hashFileSha256\(result\.uri\)/);
});
