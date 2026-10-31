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

const { normalizeDebtAmounts, sumDebtAmounts } = loadTypeScriptModule('../../utils/apiPayload.ts');
const screenSource = readFileSync(new URL('./ReservationScreen.tsx', import.meta.url), 'utf8');
const localeSource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8');

test('debt preview distinguishes a valid zero balance from an unavailable or malformed response', () => {
  const emptyDebts = normalizeDebtAmounts([]);
  assert.deepEqual(emptyDebts, []);
  assert.equal(sumDebtAmounts(emptyDebts), 0);
  assert.equal(normalizeDebtAmounts(null), null);
  assert.equal(normalizeDebtAmounts([{ amount: 'bad' }]), null);
  assert.match(screenSource, /if \(!debts\) throw new Error\('Invalid debt preview response'\)/);
  assert.doesNotMatch(screenSource, /setOpenDebtsTotal\(rows \? sumDebtAmounts\(rows\) : 0\)/);
});

test('loyalty and debt previews have independent loading, error and retry states', () => {
  assert.match(screenSource, /const \[loyaltyLoadError, setLoyaltyLoadError\] = useState\(false\)/);
  assert.match(screenSource, /const \[debtsLoadError, setDebtsLoadError\] = useState\(false\)/);
  assert.match(screenSource, /onPress=\{\(\) => \{ void loadLoyaltyPreview\(\); \}\}/);
  assert.match(screenSource, /onPress=\{\(\) => \{ void loadDebtPreview\(\); \}\}/);
  assert.match(screenSource, /t\('reservation\.loyaltyPreviewLoadError'\)/);
  assert.match(screenSource, /t\('reservation\.debtPreviewLoadError'\)/);
  assert.match(screenSource, /t\('reservation\.previewStale'\)/);
  assert.match(screenSource, /requestId !== loyaltyRequestIdRef\.current/);
  assert.match(screenSource, /requestId === debtsRequestIdRef\.current/);
  assert.match(screenSource, /await api\.post\('\/api\/reservations'/);
  for (const key of ['loyaltyPreviewLoadError', 'debtPreviewLoadError', 'previewStale']) {
    assert.match(localeSource, new RegExp(`${key}:\\s*'[^']+'`));
  }
});
