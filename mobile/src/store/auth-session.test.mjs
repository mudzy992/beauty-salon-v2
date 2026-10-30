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

const { extractUserFromPayload } = loadTypeScriptModule('./auth-user.ts');
const { removeAuthTokenSafely } = loadTypeScriptModule('./session-cleanup.ts');
const authStoreSource = readFileSync(new URL('./authStore.ts', import.meta.url), 'utf8');
const userTypesSource = readFileSync(new URL('../types/index.ts', import.meta.url), 'utf8');

const loginUser = {
  id: 'client-1',
  username: 'client',
  email: null,
  firstName: 'Test',
  lastName: 'Client',
  isEmailVerified: false,
  gender: null,
  genderOnboardingCompleted: false,
  roles: ['CLIENT'],
};

test('auth user parser accepts login/profile contract and nested envelopes but rejects incomplete payloads', () => {
  assert.deepEqual(extractUserFromPayload(loginUser), loginUser);
  assert.deepEqual(extractUserFromPayload({ user: loginUser }), loginUser);
  assert.deepEqual(extractUserFromPayload({ data: { user: loginUser } }), loginUser);
  assert.equal(extractUserFromPayload({ id: 'only-an-id' }), null);
  assert.equal(extractUserFromPayload({ ...loginUser, roles: undefined }), null);
  assert.equal(extractUserFromPayload({ ...loginUser, roles: ['CLIENT', null] }), null);
  assert.equal(
    extractUserFromPayload({ ...loginUser, roles: [{ role: { name: 'CLIENT' } }] }).id,
    'client-1',
  );
});

test('User typing reflects role strings returned by login and profile APIs', () => {
  assert.match(userTypesSource, /roles:\s*string\[\]\s*\|\s*UserRole\[\]/);
  assert.match(userTypesSource, /isActive\?: boolean/);
  assert.match(userTypesSource, /createdAt\?: string/);
});

test('failed SecureStore deletion cannot block in-memory logout or initialization completion', async () => {
  let calls = 0;
  await assert.doesNotReject(removeAuthTokenSafely(async () => { calls += 1; }));
  await assert.doesNotReject(removeAuthTokenSafely(async () => { throw new Error('SecureStore unavailable'); }));
  await assert.doesNotReject(removeAuthTokenSafely(() => { throw new Error('synchronous failure'); }));
  assert.equal(calls, 1);

  assert.equal((authStoreSource.match(/await removeAuthTokenSafely\(removeStoredToken\)/g) ?? []).length, 2);
  assert.match(authStoreSource, /get\(\)\.logout\(\)\.catch\(\(\) => undefined\)/);
  assert.match(authStoreSource, /set\(\{ user: null, token: null, isInitialized: true \}\)/);
});
