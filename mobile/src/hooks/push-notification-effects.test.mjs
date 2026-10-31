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

const { safelyRunPushTask } = loadTypeScriptModule('./safe-push-task.ts');
const hookSource = readFileSync(new URL('./usePushNotifications.real.ts', import.meta.url), 'utf8');

test('push task wrapper contains synchronous, asynchronous and reporter failures', async () => {
  assert.equal(await safelyRunPushTask(async () => 'ok', () => {}), 'ok');

  const reported = [];
  assert.equal(
    await safelyRunPushTask(async () => { throw new Error('native async failure'); }, (error) => reported.push(error.message)),
    null,
  );
  assert.equal(
    await safelyRunPushTask(() => { throw new Error('native sync failure'); }, () => { throw new Error('logger failure'); }),
    null,
  );
  assert.deepEqual(reported, ['native async failure']);
});

test('push notification native APIs, callbacks and navigation are best-effort', () => {
  assert.match(hookSource, /safelyRunPushTask\(\s*\(\) => Notifications\.getLastNotificationResponseAsync\(\)/);
  assert.match(hookSource, /safelyRunPushTask\(\s*registerForPushNotificationsAsync/);
  assert.match(hookSource, /safelyRunPushTask\(\s*fetchNotifications/);
  assert.match(hookSource, /safelyRunPushTask\(\s*\(\) => Notifications\.setBadgeCountAsync\(0\)/);
  assert.match(hookSource, /safelyRunPushTask\(\s*\(\) => Notifications\.setBadgeCountAsync\(unreadCount\)/);
  assert.match(hookSource, /safelyRunPushTask\(\s*\(\) => navigateFromPushData/);
  assert.match(hookSource, /const lastResponse = await safelyRunPushTask[\s\S]*?if \(!isMounted\) return;/);
  assert.doesNotMatch(hookSource, /void fetchNotifications\(\)/);
  assert.doesNotMatch(hookSource, /void Notifications\.setBadgeCountAsync\(/);
  assert.match(hookSource, /try \{\s*receivedListener\.current = Notifications\.addNotificationReceivedListener/);
  assert.match(hookSource, /try \{\s*responseListener\.current = Notifications\.addNotificationResponseReceivedListener/);
  assert.match(hookSource, /try \{\s*receivedListener\.current\?\.remove\(\)/);
  assert.match(hookSource, /try \{\s*responseListener\.current\?\.remove\(\)/);
});

test('push registration and token-generation failures never log raw error payloads', () => {
  const registrationCatch = hookSource.match(
    /await api\.post\('\/api\/notifications\/push-token'[\s\S]*?catch \(e: unknown\) \{([\s\S]*?)\n\s{6}\}/,
  )?.[1];
  assert.ok(registrationCatch, 'Missing push-token registration error handler');
  assert.match(registrationCatch, /const err = e as \{ response\?: \{ status\?: number \} \}/);
  assert.match(registrationCatch, /err\?\.response\?\.status \?\? 'network error'/);
  assert.doesNotMatch(registrationCatch, /response\?\.data|console\.warn\([\s\S]*\b(?:error|err|data)\s*\)/);
  assert.match(hookSource, /console\.error\('\[Push\] getExpoPushTokenAsync failed\.'\)/);
  assert.doesNotMatch(hookSource, /getExpoPushTokenAsync failed:',\s*msg/);
});
