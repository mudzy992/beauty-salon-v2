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

phase="Initialize synthetic Compose config"
on_error() {
  local status=$?
  printf '::error title=Backend container verification failed::Failed during %s (exit %s).\n' "$phase" "$status"
  exit "$status"
}
trap on_error ERR

compose_json="$work_dir/compose.json"
phase="Render Compose config with synthetic placeholders"
docker compose config --format json > "$compose_json"
phase="Assert the manual migration profile, networks and readiness configuration"
node - "$compose_json" <<'NODE'
const fs = require('node:fs');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const backend = config.services?.backend;
const migrate = config.services?.migrate;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
try {
  check(Boolean(backend), 'Compose backend service must exist.');
  check(Boolean(migrate), 'Compose migration service must exist.');
  check(backend.build?.target === 'runtime', 'API build target must be runtime.');
  check(migrate.build?.target === 'migrator', 'Migration build target must be migrator.');
  check(migrate.profiles?.includes('migrations'), 'Migration service must use the manual migrations profile.');
  check(
    !Object.hasOwn(backend.depends_on ?? {}, 'migrate'),
    'API service must not automatically depend on the migration job.',
  );
  check(migrate.restart === 'no', 'Migration job restart policy must be no.');
  check(
    backend.healthcheck?.test?.join(' ').includes('/health/ready'),
    'Backend healthcheck must call /health/ready.',
  );
  check(
    backend.volumes?.some((mount) => mount.target === '/usr/app/uploads'),
    'Backend upload storage must remain mounted at /usr/app/uploads.',
  );
  const hasNetwork = (networks, name) =>
    Array.isArray(networks)
      ? networks.includes(name)
      : Object.hasOwn(networks ?? {}, name);
  check(hasNetwork(migrate.networks, 'db_net'), 'Migration job must use db_net.');
  check(!hasNetwork(migrate.networks, 'redis_net'), 'Migration job must not use redis_net.');
  const migrationEnvKeys = Array.isArray(migrate.environment)
    ? migrate.environment.map((entry) => entry.split('=')[0])
    : Object.keys(migrate.environment ?? {});
  check(
    JSON.stringify(migrationEnvKeys.sort()) === JSON.stringify(['DATABASE_URL']),
    'Migration job environment must contain only DATABASE_URL.',
  );
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown Compose validation failure.';
  console.error(`::error title=Compose container validation failed::${message}`);
  process.exit(1);
}
NODE

runtime_image="beauty-salon-backend:ci-runtime"
migrator_image="beauty-salon-backend:ci-migrator"
phase="Build the non-root API runtime image"
docker build --target runtime --tag "$runtime_image" ./backend
phase="Build the non-root one-shot migration image"
docker build --target migrator --tag "$migrator_image" ./backend

phase="Inspect API and migration image configuration"
docker image inspect --format '{{json .Config}}' "$runtime_image" > "$work_dir/runtime-config.json"
docker image inspect --format '{{json .Config}}' "$migrator_image" > "$work_dir/migrator-config.json"
phase="Assert image users, commands and environment separation"
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

phase="Smoke-check production dependencies and Prisma Client in the API image"
docker run --rm --entrypoint node "$runtime_image" -e '
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const { PrismaClient } = require("@prisma/client");
  assert.equal(typeof PrismaClient, "function");
  assert.ok(fs.existsSync("/usr/app/node_modules/.prisma/client/index.js"));
  assert.ok(!fs.existsSync("/usr/app/node_modules/prisma"), "runtime image must not include Prisma CLI/dev dependencies");
  assert.equal(process.getuid(), 10001);
'

phase="Smoke-check Prisma CLI and migration directories in the migrator image"
docker run --rm --entrypoint node "$migrator_image" -e '
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  assert.ok(fs.existsSync("/usr/app/node_modules/.bin/prisma"));
  assert.ok(fs.existsSync("/usr/app/prisma/migrations"));
  assert.equal(process.getuid(), 10001);
'

printf 'Backend container checks passed (synthetic image/config only; no DB or deployment used).\n'
