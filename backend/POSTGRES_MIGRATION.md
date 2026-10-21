# PostgreSQL schema and migration operations

**Current status from repository code (2026-10-21):** the active Prisma datasource/runtime adapter are PostgreSQL (`@prisma/adapter-pg`), and `PrismaService` rejects a non-PostgreSQL provider. Active migrations exist at `prisma/migrations/20260822100257_postgresql_baseline/` and `prisma/migrations/20260915085100_blog_post_seo/`. Historical MySQL SQL is retained at `prisma/migrations_mysql_backup/` and is not an input to the active PostgreSQL migrator.

This document describes repository commands and safe preconditions. It does **not** establish production database state, data migration history, backup health or permission to run commands against a live system.

## Configure an isolated database

1. Install a supported PostgreSQL instance/schema dedicated to local development or tests; do not use production.
2. Copy `.env.example` to an ignored `.env` and set `DATABASE_PROVIDER=postgres`, a PostgreSQL `DATABASE_URL`, and a unique local JWT secret.
3. Do not paste credentials into tracked files, command history, tickets or CI logs.
4. Install from the lockfile and check the current schema:

```bash
npm ci --no-audit --no-fund
npm run db:validate
npm run db:generate
npm run db:migrate:status
```

Prisma 7 loads the datasource URL through `prisma.config.ts`. Generation/schema validation should not connect to the configured database, but migration status does.

## Applying reviewed migrations

For an existing schema in a deliberately selected disposable/local DB:

```bash
npm run db:migrate:deploy
```

For a new schema change during development, use a disposable PostgreSQL database and the configured development workflow:

```bash
npm run db:migrate:dev -- --name descriptive_change
```

Review the generated migration SQL, constraints, data impact, lock duration and rollback/recovery path before committing or scheduling deployment. Never use `migrate dev` against production. Do not regenerate or replace the checked-in PostgreSQL baseline to address a validation failure; investigate the failed check and preserve migration history.

The baseline and later migrations have not been proven against a fresh PostgreSQL server in this audit environment. Add that to the isolated integration/CI workflow before claiming fresh-database reproducibility. CI's current dummy URL is for client generation/schema validation only and does not create a database connection.

## Seed and runtime

`npm run db:seed` writes data. Run it only against an explicitly identified local/test database after reviewing `prisma/seed.ts`. `npm run db:init` runs migration deploy followed by seed and therefore is also mutating. The production Docker entrypoint runs `prisma migrate deploy` before the server process; a deployment should have an approved backup/restore and migration ownership procedure before using that image.

## MySQL archive and data-history caveat

`prisma/migrations_mysql_backup/` is present in the repository as a historical SQL archive. It is separate from active `prisma/migrations/`; do not move/copy its SQL into the active directory or run it with the PostgreSQL migrator.

The existence of PostgreSQL schema migrations does not establish whether customer/business rows were migrated from MySQL, when production switched databases, whether IDs/financial totals were reconciled, or whether a rollback source exists. Those facts require owner/runbook evidence and non-production reconciliation. No production DB was queried or modified for this audit.

## Operational/secret handling

- `DATABASE_URL` is supplied at runtime and must not be baked into Docker build args or image `ENV`.
- The backend Docker build uses a dummy, non-routable generate-only URL for Prisma Client generation; it is not a database credential and is not used at runtime.
- Keep local `.env` ignored. Historical credential material was removed from the current Git index, but Git history was not rewritten; coordinate credential revocation/rotation with the owning administrator.
- Do not rotate `APP_SETTINGS_ENCRYPTION_KEY` without a controlled dual-key/re-encryption plan and tested recovery.

See [`docs/audit/TEST_WORKFLOW.md`](../docs/audit/TEST_WORKFLOW.md) for safe integration tests and [`docs/audit/IMPLEMENTATION_PLAN.md`](../docs/audit/IMPLEMENTATION_PLAN.md) for migration/idempotency phases.