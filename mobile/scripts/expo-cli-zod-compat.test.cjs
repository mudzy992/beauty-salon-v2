const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

function expoCliSchemaPath(fileName) {
  const expoRoot = path.resolve(path.dirname(require.resolve('expo')), '..');
  const cliEntry = require.resolve('@expo/cli', { paths: [expoRoot] });
  const cliRoot = path.resolve(path.dirname(cliEntry), '../..');
  return path.join(cliRoot, 'build', 'src', 'start', 'server', fileName);
}

test('Expo SDK57 CLI plugin schemas accept Zod 4-compatible data', () => {
  const { version } = require('zod/package.json');
  assert.match(version, /^4\./, `expected patched Zod 4, received ${version}`);

  const { DevToolsPluginOutputSchema, PluginSchema } = require(
    expoCliSchemaPath('DevToolsPlugin.schema.js'),
  );
  const { createMCPDevToolsExtensionSchema } = require(
    expoCliSchemaPath('createMCPDevToolsExtensionSchema.js'),
  );

  assert.equal(
    PluginSchema.safeParse({ packageName: 'smoke-plugin', packageRoot: '/tmp/plugin' })
      .success,
    true,
  );
  assert.equal(
    PluginSchema.safeParse({ packageName: '', packageRoot: '/tmp/plugin' }).success,
    false,
  );
  assert.equal(
    DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'ok', level: 'info' }])
      .success,
    true,
  );

  const mcpSchema = createMCPDevToolsExtensionSchema({
    packageName: 'smoke-plugin',
    cliExtensions: {
      description: 'Smoke test',
      entryPoint: 'index.js',
      commands: [
        {
          name: 'hello',
          title: 'Hello',
          environments: ['cli'],
          parameters: [{ name: 'value', type: 'text' }],
        },
      ],
    },
  });

  assert.equal(mcpSchema.safeParse({ command: 'hello', value: 'world' }).success, true);
  assert.equal(mcpSchema.safeParse({ command: 'missing' }).success, false);
  assert.equal(mcpSchema.safeParse({ command: 'hello', unexpected: true }).success, false);
});
