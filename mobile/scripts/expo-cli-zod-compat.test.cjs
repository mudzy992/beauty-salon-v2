const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');

function expoPackageRoot() {
  return path.resolve(path.dirname(require.resolve('expo')), '..');
}

function expoCliModule(fileName) {
  const cliEntry = require.resolve('@expo/cli', { paths: [expoPackageRoot()] });
  const cliRoot = path.resolve(path.dirname(cliEntry), '../..');
  return require(path.join(cliRoot, 'build', 'src', 'start', 'server', fileName));
}

test('Expo SDK57 CLI JSON schemas validate and MCP schema accepts Zod 4', () => {
  const { z } = require('zod');
  const { validate, ValidationError } = require(
    require.resolve('@expo/schema-utils', { paths: [expoPackageRoot()] }),
  );
  const { DevToolsPluginOutputSchema, PluginSchema } = expoCliModule(
    'devtools/DevToolsPlugin.schema.js',
  );
  const { createMCPDevToolsExtensionSchema } = expoCliModule(
    'mcp/createMCPDevToolsExtensionSchema.js',
  );
  const isValid = (schema, value) => {
    try {
      validate(schema, value);
      return true;
    } catch (error) {
      if (error instanceof ValidationError) return false;
      throw error;
    }
  };

  assert.equal(PluginSchema.type, 'object');
  assert.equal(
    isValid(PluginSchema, { packageName: 'smoke-plugin', packageRoot: '/tmp/plugin' }),
    true,
  );
  assert.equal(isValid(PluginSchema, { packageName: '', packageRoot: '/tmp/plugin' }), false);
  assert.equal(
    isValid(DevToolsPluginOutputSchema, [{ type: 'text', text: 'ok', level: 'info' }]),
    true,
  );
  assert.equal(isValid(DevToolsPluginOutputSchema, [{ type: 'text' }]), false);

  const mcpSchema = createMCPDevToolsExtensionSchema(
    {
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
    },
    z,
  );

  assert.equal(mcpSchema.safeParse({ command: 'hello', value: 'world' }).success, true);
  assert.equal(mcpSchema.safeParse({ command: 'missing' }).success, false);
  assert.equal(mcpSchema.safeParse({ command: 'hello', unexpected: true }).success, false);
})
