const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

const originalLoad = Module._load;
const originalTypeScriptLoader = require.extensions['.ts'];

require.extensions['.ts'] = (loadedModule, fileName) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(fileName, 'utf8'), {
    fileName,
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  loadedModule._compile(outputText, fileName);
};

Module._load = function loadWithSecureStoreStub(request, parent, isMain) {
  if (request === 'expo-secure-store') {
    return {
      deleteItemAsync: async () => undefined,
      getItemAsync: async () => 'avatar-upload-test-token',
      setItemAsync: async () => undefined,
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { default: api } = require('./api.ts');
Module._load = originalLoad;
require.extensions['.ts'] = originalTypeScriptLoader;

test('mobile multipart requests preserve FormData and attach the bearer token', async () => {
  const originalAdapter = api.defaults.adapter;
  let capturedRequest;
  api.defaults.adapter = async (config) => {
    capturedRequest = config;
    return {
      config,
      data: { ok: true },
      headers: {},
      status: 201,
      statusText: 'Created',
    };
  };

  try {
    const formData = new FormData();
    formData.append('file', new Blob(['synthetic-avatar']), 'avatar.jpg');

    await api.post('/api/users/profile/avatar', formData);

    assert.ok(capturedRequest.data instanceof FormData);
    assert.notEqual(
      capturedRequest.headers.getContentType(),
      'application/json',
    );
    assert.equal(
      capturedRequest.headers.get('Authorization'),
      'Bearer avatar-upload-test-token',
    );
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});
