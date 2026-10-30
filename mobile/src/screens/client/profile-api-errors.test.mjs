import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../../utils/apiError.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  fileName: fileURLToPath(new URL('../../utils/apiError.ts', import.meta.url)),
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const loadedModule = { exports: {} };
new Function('module', 'exports', outputText)(loadedModule, loadedModule.exports);
const { getApiErrorMessage } = loadedModule.exports;

test('API error messages safely handle server strings, arrays, network failures, and malformed payloads', () => {
  assert.equal(getApiErrorMessage({ response: { data: { message: '  Invalid code  ' } } }, 'Fallback'), 'Invalid code');
  assert.equal(getApiErrorMessage({ response: { data: { message: ['First error', null, 'Second error'] } } }, 'Fallback'), 'First error\nSecond error');
  assert.equal(getApiErrorMessage({ response: { data: { message: [] } } }, 'Fallback'), 'Fallback');
  assert.equal(getApiErrorMessage({ response: { data: { message: { text: 'unsafe object' } } } }, 'Fallback'), 'Fallback');
  assert.equal(getApiErrorMessage(new Error('Network Error'), 'Fallback'), 'Fallback');
  assert.equal(getApiErrorMessage(null, 'Fallback'), 'Fallback');
  assert.equal(getApiErrorMessage({ response: { data: { message: 'x'.repeat(1200) } } }, 'Fallback').length, 1000);
  const boundedList = getApiErrorMessage({ response: { data: { message: Array(7).fill('y'.repeat(400)) } } }, 'Fallback');
  assert.equal(boundedList.split('\n').length, 5);
  assert.ok(boundedList.length <= 1504);
});
