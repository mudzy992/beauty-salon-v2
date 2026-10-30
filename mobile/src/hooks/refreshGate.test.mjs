import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const filename = new URL('./refreshGate.ts', import.meta.url);
const source = readFileSync(filename, 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: fileURLToPath(filename),
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loadedModule = { exports: {} };
new Function('module', 'exports', outputText)(loadedModule, loadedModule.exports);
const { createRefreshGate } = loadedModule.exports;
const autoRefreshSource = readFileSync(new URL('./useAutoRefresh.ts', import.meta.url), 'utf8');

test('auto-refresh is focus-scoped and the five API screens no longer duplicate initial fetch effects', () => {
  assert.match(autoRefreshSource, /useFocusEffect\(/);
  assert.match(autoRefreshSource, /refreshGateRef\.current\?\.run\(/);
  assert.match(autoRefreshSource, /\}, \[intervalMs, run, callback\]\)/);
  assert.doesNotMatch(autoRefreshSource, /useEffect\(/);

  const screens = [
    { path: '../screens/client/NotificationsScreen.tsx', refresh: 'refreshNotifications' },
    { path: '../screens/client/MyReservationsScreen.tsx', refresh: 'refreshReservations' },
    { path: '../screens/client/HomeScreen.tsx', refresh: 'refreshHomeData' },
    { path: '../screens/stylist/StylistInboxScreen.tsx', refresh: 'refreshReservations' },
    { path: '../screens/stylist/StylistScheduleScreen.tsx', refresh: 'refreshReservations' },
  ];
  for (const { path, refresh } of screens) {
    const screen = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.doesNotMatch(screen, /useEffect\(\(\)\s*=>\s*\{?\s*(?:fetch|fetchData|fetchReservations)\(\)/, path);
    assert.match(screen, new RegExp(`const ${refresh} = useAutoRefresh\\(`), path);
    assert.match(screen, new RegExp(`${refresh}\\(`), path);
  }
  assert.match(
    readFileSync(new URL('../screens/client/HomeScreen.tsx', import.meta.url), 'utf8'),
    /usePublicContentSocketRefresh\(refreshHomeData\)/,
  );
  for (const path of [
    '../screens/client/MyReservationsScreen.tsx',
    '../screens/stylist/StylistInboxScreen.tsx',
    '../screens/stylist/StylistScheduleScreen.tsx',
  ]) {
    assert.match(readFileSync(new URL(path, import.meta.url), 'utf8'), /useReservationSocketRefresh\(refreshReservations\)/);
  }
});

test('refresh gate coalesces overlapping requests and can run again after completion', async () => {
  const gate = createRefreshGate();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const calls = [];

  const first = gate.run(() => {
    calls.push('first');
    return pending;
  });
  const overlapping = gate.run(() => calls.push('overlapping'));
  assert.equal(overlapping, first);
  assert.equal(gate.inFlight, true);
  await Promise.resolve();
  assert.deepEqual(calls, ['first']);

  release();
  await Promise.all([first, overlapping]);
  assert.equal(gate.inFlight, false);
  await gate.run(() => calls.push('later'));
  assert.deepEqual(calls, ['first', 'later']);
});

test('refresh gate contains async and synchronous callback errors and permits retry', async () => {
  const errors = [];
  const gate = createRefreshGate((error) => errors.push(error));
  const asyncFailure = new Error('temporary API failure');
  const syncFailure = new Error('synchronous callback failure');

  await assert.doesNotReject(gate.run(() => Promise.reject(asyncFailure)));
  await assert.doesNotReject(gate.run(() => { throw syncFailure; }));
  await gate.run(() => undefined);

  const noisyReporterGate = createRefreshGate(async () => {
    throw new Error('reporter failure');
  });
  await assert.doesNotReject(noisyReporterGate.run(() => Promise.reject(asyncFailure)));

  assert.deepEqual(errors, [asyncFailure, syncFailure]);
  assert.equal(gate.inFlight, false);
});
