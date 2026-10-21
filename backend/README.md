# Beauty Salon backend

NestJS 11 API with Prisma 7, PostgreSQL (`@prisma/adapter-pg`), Socket.IO and scheduled business workflows. This is application documentation, not the generic Nest starter README.

- System architecture: [`docs/audit/ARCHITECTURE.md`](../docs/audit/ARCHITECTURE.md)
- Static findings and evidence: [`docs/audit/FINDINGS.md`](../docs/audit/FINDINGS.md)
- Safe tests: [`docs/audit/TEST_WORKFLOW.md`](../docs/audit/TEST_WORKFLOW.md)
- Migration notes: [`POSTGRES_MIGRATION.md`](POSTGRES_MIGRATION.md)
- Current source map: [`docs/codebase-map/BACKEND.md`](../docs/codebase-map/BACKEND.md)

## Local setup

Use Node.js 22 and the checked-in lockfile. Copy `backend/.env.example` to an ignored local `backend/.env`, set a unique local `JWT_SECRET`, and set `DATABASE_PROVIDER=postgres` plus a disposable/local PostgreSQL `DATABASE_URL`. Never use production values in development or CI.

```bash
npm ci --no-audit --no-fund
npm run db:validate
npm run db:generate
npm run start:dev
```

The sample `PORT=10001` aligns with the frontend Vite proxy; without `PORT`, `src/main.ts` defaults to 3000. Local uploaded files use `UPLOAD_ROOT` (default `./uploads`) and are served at `/uploads/`.

## Common commands

```bash
npm run build
npm test -- --runInBand
npm run lint                 # read-only
npm run lint:fix             # explicit mutating lint autofix
npm run db:validate
npm run db:generate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:seed              # only against an explicitly chosen local/test DB
```

`npm run test:e2e` currently points to `test/jest-e2e.json`, which is not present; see the test workflow before treating it as available. Prisma engine download was unavailable in the audit sandbox due to a TLS failure, so local/CI generation, backend build and runtime integration require separate verification.

## Database notes

Prisma uses the active PostgreSQL migrations under `prisma/migrations/`. Historical MySQL migration SQL is retained separately under `prisma/migrations_mysql_backup/`; it is an archive, not an active migration path. This repository cannot prove whether or when production data was moved, whether production is current with migrations, or whether backups are recoverable.

The backend Docker build generates Prisma Client using a dummy, build-only URL. `DATABASE_URL`, JWT and application-settings encryption key are runtime configuration and are not baked into the image. Root Compose expects an external PostgreSQL network and does not define a database service.

## Security scope

Previously tracked local environment/private-key material was removed from the current Git index, but Git history was not rewritten. Credential owners should revoke/rotate affected credentials outside this repository. Keep real `.env` files, Firebase Admin service-account JSON and private signing keys out of version control and Docker build contexts. Do not rotate `APP_SETTINGS_ENCRYPTION_KEY` without a controlled re-encryption plan.