#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Compose interpolation uses synthetic placeholders only; this script never opens a database.
export VITE_API_URL="http://127.0.0.1:10001"
export VITE_API_FILES_URL="http://127.0.0.1:10001"
export DATABASE_URL="postgresql://ci_only:ci_only@127.0.0.1:5432/beauty_salon_ci?schema=public"
export JWT_SECRET="ci_only_not_a_secret"
export APP_SETTINGS_ENCRYPTION_KEY="ci_only_not_a_secret"

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

compose_json="$work_dir/compose.json"
docker compose config --format json > "$compose_json"
node - "$compose_json" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const backend = config.services?.backend;
const migrate = config.services?.migrate;
assert.ok(backend, 'Compose backend service must exist');
assert.ok(migrate, 'Compose migration service must exist');
assert.equal(backend.build?.target, 'runtime');
assert.equal(migrate.build?.target, 'migrator');
assert.ok(migrate.profiles?.includes('migrations'));
assert.ok(
  !Object.hasOwn(backend.depends_on ?? {}, 'migrate'),
  'migration job must remain an explicit manual profile, not auto-run on API startup',
);
assert.equal(migrate.restart, 'no');
assert.ok(
  backend.healthcheck?.test?.join(' ').includes('/health/ready'),
  'backend healthcheck must call the readiness endpoint',
);
assert.ok(
  backend.volumes?.some((mount) => mount.target === '/usr/app/uploads'),
  'backend upload storage must remain mounted',
);
const hasNetwork = (networks, name) =>
  Array.isArray(networks)
    ? networks.includes(name)
    : Object.hasOwn(networks ?? {}, name);
assert.ok(hasNetwork(migrate.networks, 'db_net'));
assert.ok(!hasNetwork(migrate.networks, 'redis_net'));
const migrationEnvKeys = Array.isArray(migrate.environment)
  ? migrate.environment.map((entry) => entry.split('=')[0])
  : Object.keys(migrate.environment ?? {});
assert.deepEqual(migrationEnvKeys.sort(), ['DATABASE_URL']);
NODE

runtime_image="beauty-salon-backend:ci-runtime"
migrator_image="beauty-salon-backend:ci-migrator"
docker build --target runtime --tag "$runtime_image" ./backend
docker build --target migrator --tag "$migrator_image" ./backend

docker image inspect --format '{{json .Config}}' "$runtime_image" > "$work_dir/runtime-config.json"
docker image inspect --format '{{json .Config}}' "$migrator_image" > "$work_dir/migrator-config.json"
node - "$work_dir/runtime-config.json" "$work_dir/migrator-config.json" <<'NODE'
const fs = require('node:fs');
const assert = require('node:assert/strict');
const runtime = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const migrator = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const runtimeEnv = runtime.Env ?? [];
const migratorEnv = migrator.Env ?? [];
assert.equal(runtime.User, '10001:10001', 'API image must run as non-root');
assert.equal(migrator.User, '10001:10001', 'migration image must run as non-root');
for (const forbidden of [
  'DATABASE_URL=',
  'JWT_SECRET=',
  'APP_SETTINGS_ENCRYPTION_KEY=',
  'SOCKET_IO_REDIS_URL=',
]) {
  assert.ok(!runtimeEnv.some((item) => item.startsWith(forbidden)), `${forbidden} must not be baked into API image`);
  assert.ok(!migratorEnv.some((item) => item.startsWith(forbidden)), `${forbidden} must not be baked into migration image`);
}
assert.deepEqual(runtime.Cmd, ['node', 'dist/src/main.js']);
assert.ok(!runtime.Cmd.join(' ').includes('migrate deploy'));
assert.ok(migrator.Cmd.join(' ').includes('migrate'));
assert.ok(migrator.Cmd.join(' ').includes('deploy'));
NODE

docker run --rm --entrypoint node "$runtime_image" -e '
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const { PrismaClient } = require("@prisma/client");
  assert.equal(typeof PrismaClient, "function");
  assert.ok(fs.existsSync("/usr/app/node_modules/.prisma/client/index.js"));
  assert.ok(!fs.existsSync("/usr/app/node_modules/prisma"), "runtime image must not include Prisma CLI/dev dependencies");
  assert.equal(process.getuid(), 10001);
'

docker run --rm --entrypoint node "$migrator_image" -e '
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  assert.ok(fs.existsSync("/usr/app/node_modules/.bin/prisma"));
  assert.ok(fs.existsSync("/usr/app/prisma/migrations"));
  assert.equal(process.getuid(), 10001);
'

printf 'Backend container checks passed (synthetic image/config only; no DB or deployment used).\n'
