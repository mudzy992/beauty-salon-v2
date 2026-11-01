import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')

function loadTypeScriptModule(relativePath) {
  const filename = new URL(relativePath, import.meta.url)
  const source = readFileSync(filename, 'utf8')
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: fileURLToPath(filename),
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  })
  assert.deepEqual(
    (diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
    [],
    `${relativePath} should transpile without TypeScript diagnostics`,
  )
  const loadedModule = { exports: {} }
  new Function('module', 'exports', outputText)(loadedModule, loadedModule.exports)
  return loadedModule.exports
}

const { parseCreatedDailyLogEntryId } = loadTypeScriptModule('../../utils/apiPayload.ts')
const screen = readFileSync(new URL('./DailyLogNewEntryScreen.tsx', import.meta.url), 'utf8')

test('daily-log create response parser accepts only a non-empty string ID', () => {
  assert.equal(parseCreatedDailyLogEntryId({ id: '  entry-42  ' }), 'entry-42')
  assert.equal(parseCreatedDailyLogEntryId(null), null)
  assert.equal(parseCreatedDailyLogEntryId([]), null)
  assert.equal(parseCreatedDailyLogEntryId({}), null)
  assert.equal(parseCreatedDailyLogEntryId({ id: 42 }), null)
  assert.equal(parseCreatedDailyLogEntryId({ id: '  ' }), null)
})

test('daily-log creation validates response IDs and safely surfaces API errors', () => {
  assert.match(screen, /api\.post<unknown>\('\/api\/daily-log'/)
  assert.match(screen, /parseCreatedDailyLogEntryId\(response\)/)
  assert.match(screen, /saveResponseFallback/)
  assert.match(
    screen,
    /getApiErrorMessage\(err, t\('stylist\.dailyLogDetail\.saveErrorFallback'\)\)/,
  )
  assert.doesNotMatch(screen, /err as \{ response\?: \{ data\?: \{ message\?/)
})
