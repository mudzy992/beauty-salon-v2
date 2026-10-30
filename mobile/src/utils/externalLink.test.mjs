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

const { normalizeExternalUrl, tryOpenExternalUrl } = loadTypeScriptModule('./externalLink.ts');

test('external links accept only explicitly allowed schemes and reject malformed destinations', () => {
  assert.equal(normalizeExternalUrl(' https://example.com/path ', ['https']), 'https://example.com/path');
  assert.equal(normalizeExternalUrl('tel:+387 61 111 222', ['tel']), 'tel:+387 61 111 222');
  assert.equal(normalizeExternalUrl('mailto:salon@example.ba', ['mailto']), 'mailto:salon@example.ba');
  assert.equal(normalizeExternalUrl('maps:0,0?q=Salon', ['maps']), 'maps:0,0?q=Salon');
  assert.equal(normalizeExternalUrl('javascript:alert(1)', ['https', 'http']), null);
  assert.equal(normalizeExternalUrl('https://user:pass@example.com', ['https']), null);
  assert.equal(normalizeExternalUrl('https://', ['https']), null);
  assert.equal(normalizeExternalUrl('tel:123abc', ['tel']), null);
  assert.equal(normalizeExternalUrl('mailto:not-an-email', ['mailto']), null);
  assert.equal(normalizeExternalUrl('https://example.com\nmalicious', ['https']), null);
});

test('external link opener reports rejected OS links without throwing', async () => {
  assert.equal(await tryOpenExternalUrl('https://example.com', ['https'], async () => {}), true);
  assert.equal(await tryOpenExternalUrl('https://example.com', ['https'], async () => { throw new Error('no handler'); }), false);
  assert.equal(await tryOpenExternalUrl('javascript:alert(1)', ['https'], async () => {}), false);
});

test('Contact screen routes social, phone, email and maps links through guarded handlers', () => {
  const screen = readFileSync(new URL('../screens/client/ContactScreen.tsx', import.meta.url), 'utf8');
  assert.match(screen, /tryOpenExternalUrl\(nativeUrl, \[nativeScheme\]/);
  assert.match(screen, /tryOpenExternalUrl\(webUrl, \['https'\]/);
  assert.match(screen, /openExternal\(`tel:\$\{phone\.replace/);
  assert.match(screen, /openExternal\(`mailto:\$\{email\}`/);
  assert.match(screen, /openExternal\(url, \['https', 'http'\]\)/);
  assert.match(screen, /showLinkError\(\)/);
  assert.doesNotMatch(screen, /onPress=\{\(\) => Linking\.openURL/);
});
