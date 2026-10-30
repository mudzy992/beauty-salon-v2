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

const { readTokenSafely, StoredTokenUnavailableError } = loadTypeScriptModule('../services/token-storage.ts');
const apiSource = readFileSync(new URL('../services/api.ts', import.meta.url), 'utf8');
const authStoreSource = readFileSync(new URL('./authStore.ts', import.meta.url), 'utf8');
const authLayoutSource = readFileSync(new URL('../../app/(auth)/_layout.tsx', import.meta.url), 'utf8');
const rootLayoutSource = readFileSync(new URL('../../app/_layout.tsx', import.meta.url), 'utf8');
const bootstrapNoticeSource = readFileSync(new URL('../components/SessionBootstrapNotice.tsx', import.meta.url), 'utf8');
const refreshNoticeSource = readFileSync(new URL('../components/ProfileRefreshNotice.tsx', import.meta.url), 'utf8');
const localeSource = readFileSync(new URL('../i18n/bs.ts', import.meta.url), 'utf8');

test('secure token reads distinguish a saved token, no token and storage failure', async () => {
  assert.deepEqual(await readTokenSafely(async () => 'saved-token'), { status: 'available', token: 'saved-token' });
  assert.deepEqual(await readTokenSafely(async () => null), { status: 'available', token: null });
  assert.deepEqual(await readTokenSafely(async () => { throw new Error('SecureStore unavailable'); }), { status: 'unavailable' });
  assert.deepEqual(await readTokenSafely(() => { throw new Error('synchronous failure'); }), { status: 'unavailable' });
  assert.equal(new StoredTokenUnavailableError().name, 'StoredTokenUnavailableError');
});

test('API requests do not silently proceed as unauthenticated after SecureStore read failure', () => {
  assert.match(apiSource, /readStoredToken\(\)[\s\S]*?readTokenSafely\(\(\) => SecureStore\.getItemAsync\(TOKEN_KEY\)\)/);
  assert.match(apiSource, /result\.status === 'unavailable'[\s\S]*?throw new StoredTokenUnavailableError/);
  assert.match(apiSource, /const token = await getStoredToken\(\)/);
});

test('bootstrap preserves session state on read/network/profile errors and retries without logging out', () => {
  assert.match(authStoreSource, /tokenRead\.status === 'unavailable'[\s\S]*?bootstrapError: 'storage'/);
  assert.match(authStoreSource, /if \(!token\)[\s\S]*?user: null,[\s\S]*?token: null/);
  assert.match(authStoreSource, /if \(status === 401\)[\s\S]*?removeAuthTokenSafely\(removeStoredToken\)/);
  assert.match(authStoreSource, /Storage\/network\/server\/contract errors are not proof of logout/);
  assert.match(authStoreSource, /error instanceof StoredTokenUnavailableError[\s\S]*?'storage'[\s\S]*?status === undefined \|\| status >= 500[\s\S]*?'network'/);
  assert.match(authStoreSource, /if \(get\(\)\.isInitializing\) return/);
  assert.match(authLayoutSource, /bootstrapError[\s\S]*?SessionBootstrapNotice[\s\S]*?onRetry=\{initialize\}/);
  assert.match(bootstrapNoticeSource, /onPress=\{\(\) => \{ void onRetry\(\); \}\}/);
  assert.match(localeSource, /sessionStorageUnavailable:/);
  assert.match(localeSource, /sessionNetworkUnavailable:/);
  assert.match(localeSource, /sessionProfileUnavailable:/);
});

test('profile refresh retains the current user on failure and exposes retryable stale-data state', () => {
  assert.match(authStoreSource, /if \(!currentUserId\) return false/);
  assert.match(authStoreSource, /user\.id !== currentUserId \|\| get\(\)\.user\?\.id !== currentUserId/);
  assert.match(authStoreSource, /if \(status !== 401 && get\(\)\.user\?\.id === currentUserId\)[\s\S]*?profileRefreshError: true/);
  assert.match(authStoreSource, /profileRefreshError: false/);
  assert.match(rootLayoutSource, /user && profileRefreshError[\s\S]*?ProfileRefreshNotice[\s\S]*?refreshProfile\(\)/);
  assert.match(refreshNoticeSource, /auth\.profileRefreshUnavailable/);
  assert.match(refreshNoticeSource, /common\.retry/);
  assert.match(localeSource, /profileRefreshUnavailable:/);
});
